import math
import random
import time
import os
import openai
import google.generativeai as genai

from app.simulator import config
from app.simulator.prompt_builder import format_prompt
from app.simulator.prompts import (
    BACKGROUND_PROMPT,
    LASTDAY_FORUM_AND_STOCK_PROMPT,
    LOAN_TYPE_PROMPT,
    DECIDE_IF_LOAN_PROMPT,
    LOAN_RETRY_PROMPT,
    DECIDE_BUY_STOCK_PROMPT,
    BUY_STOCK_RETRY_PROMPT,
    FIRST_DAY_FINANCIAL_REPORT,
    FIRST_DAY_BACKGROUND_KNOWLEDGE,
    SEASONAL_FINANCIAL_REPORT,
    POST_MESSAGE_PROMPT,
    NEXT_DAY_ESTIMATE_PROMPT,
    NEXT_DAY_ESTIMATE_RETRY
)

class AutonomousTrader:
    """
    An autonomous LLM-powered trader simulating real market actors.
    Features robust API interfaces, retry flows, and risk-persona-based mock fallbacks.
    """
    def __init__(self, idx, initial_price_a, initial_price_b, compliance_parser, model_name="gemini-1.5-flash"):
        self.id = idx
        self.compliance_parser = compliance_parser
        self.model_name = model_name
        
        # Select risk-persona
        self.persona = random.choice(["Conservative", "Aggressive", "Balanced", "Growth-Oriented"])
        
        # Initialize portfolio
        self.cash = random.uniform(config.MIN_INITIAL_WEALTH, config.MAX_INITIAL_WEALTH * 0.5)
        self.holding_a = int(random.uniform(500, 2000))
        self.holding_b = int(random.uniform(200, 1000))
        
        # Setup initial debt liability
        debt_amount = random.uniform(0, (self.holding_a * initial_price_a + self.holding_b * initial_price_b) * 0.3)
        self.loans = []
        if debt_amount > 1000:
            self.loans.append({
                "loan": "yes",
                "loan_type": random.randint(0, 2),
                "amount": debt_amount,
                "repayment_date": random.choice([22, 44, 66])
            })
            self.cash += debt_amount

        self.initial_net_worth = self.get_net_worth(initial_price_a, initial_price_b)
        self.chat_history = []
        self.is_bankrupt = False
        self.is_active = True

    def get_net_worth(self, price_a, price_b):
        portfolio_value = (self.holding_a * price_a) + (self.holding_b * price_b)
        outstanding_debt = sum(loan["amount"] for loan in self.loans)
        return portfolio_value + self.cash - outstanding_debt

    def get_portfolio_snapshot(self, price_a, price_b):
        a_val = self.holding_a * price_a
        b_val = self.holding_b * price_b
        debt_val = sum(loan["amount"] for loan in self.loans)
        net_worth = a_val + b_val + self.cash - debt_val
        return {
            "net_worth": net_worth,
            "cash": self.cash,
            "stock_a_value": a_val,
            "stock_b_value": b_val,
            "debt": debt_val
        }

    def query_llm(self, prompt, system_instruction=None):
        """
        Sends the compiled prompt to the LLM (Gemini or OpenAI).
        Falls back to rule-based decisions if no keys are found or APIs fail.
        """
        api_key_openai = os.getenv("OPENAI_API_KEY", "")
        api_key_gemini = os.getenv("GOOGLE_API_KEY", os.getenv("GEMINI_API_KEY", ""))

        if not api_key_openai and not api_key_gemini:
            # Silent fallback to mock model to allow instant running
            return None

        # Execute OpenAI
        if "gpt" in self.model_name.lower():
            if not api_key_openai:
                return None
            try:
                client = openai.OpenAI(api_key=api_key_openai)
                self.chat_history.append({"role": "user", "content": prompt})
                messages = []
                if system_instruction:
                    messages.append({"role": "system", "content": system_instruction})
                messages.extend(self.chat_history)
                
                response = client.chat.completions.create(
                    model=self.model_name,
                    messages=messages,
                    temperature=0.7
                )
                resp_text = response.choices[0].message.content
                self.chat_history.append({"role": "assistant", "content": resp_text})
                return resp_text
            except Exception:
                return None

        # Execute Gemini (Default)
        else:
            if not api_key_gemini:
                return None
            try:
                genai.configure(api_key=api_key_gemini)
                model = genai.GenerativeModel(self.model_name)
                
                # Format chat history for Gemini API
                formatted_history = []
                for turn in self.chat_history:
                    role_mapped = "model" if turn["role"] == "assistant" else "user"
                    formatted_history.append({"role": role_mapped, "parts": [turn["content"]]})
                
                formatted_history.append({"role": "user", "parts": [prompt]})
                self.chat_history.append({"role": "user", "content": prompt})
                
                response = model.generate_content(contents=formatted_history)
                resp_text = response.text
                self.chat_history.append({"role": "assistant", "content": resp_text})
                return resp_text
            except Exception:
                return None

    # --- Strategic Decision Functions ---

    def plan_loan(self, date, price_a, price_b, lastday_forum_message):
        """
        Agent decides whether to borrow extra capital.
        """
        if not self.is_active:
            return {"loan": "no"}

        total_debt = sum(loan["amount"] for loan in self.loans)
        max_loan = max(0.0, self.initial_net_worth - total_debt)

        if max_loan <= 0:
            return {"loan": "no"}

        inputs = {
            "date": date,
            "character": self.persona,
            "stock_a": self.holding_a,
            "stock_b": self.holding_b,
            "cash": self.cash,
            "debt": self.loans,
            "max_loan": max_loan,
            "stock_a_price": price_a,
            "stock_b_price": price_b,
            "lastday_forum_message": lastday_forum_message,
            "loan_rate1": config.LOAN_DURATIONS[0]["rate"],
            "loan_rate2": config.LOAN_DURATIONS[1]["rate"],
            "loan_rate3": config.LOAN_DURATIONS[2]["rate"]
        }

        # Select prompt strategy
        if date == 1:
            prompt_collection = PromptCollection(BACKGROUND_PROMPT, LOAN_TYPE_PROMPT, DECIDE_IF_LOAN_PROMPT)
        else:
            prompt_collection = PromptCollection(BACKGROUND_PROMPT, LASTDAY_FORUM_AND_STOCK_PROMPT, LOAN_TYPE_PROMPT, DECIDE_IF_LOAN_PROMPT)
        
        prompt = format_prompt(prompt_collection, inputs)
        
        llm_response = self.query_llm(prompt)
        
        if llm_response is None:
            # Trigger Rule-Based Credit Decision
            return self._mock_credit_decision(max_loan)

        # Validate with Parser
        is_ok, err, loan_data = self.compliance_parser.validate_credit_request(llm_response, max_loan)
        retries = 0
        while not is_ok and retries < 2:
            retry_prompt = format_prompt(LOAN_RETRY_PROMPT, {"fail_response": err})
            llm_response = self.query_llm(retry_prompt)
            if llm_response is None:
                return self._mock_credit_decision(max_loan)
            is_ok, err, loan_data = self.compliance_parser.validate_credit_request(llm_response, max_loan)
            retries += 1

        if not is_ok:
            # Default to mock
            return self._mock_credit_decision(max_loan)

        # Apply credit
        if loan_data["loan"] == "yes":
            loan_data["repayment_date"] = date + config.LOAN_DURATIONS[loan_data["loan_type"]]["days"]
            self.loans.append(loan_data)
            self.cash += loan_data["amount"]
        return loan_data

    def plan_stock_order(self, date, session, stock_a, stock_b):
        """
        Agent decides trading actions (buy/sell limit orders).
        """
        if not self.is_active:
            return {"action_type": "no"}

        stock_a_deals = stock_a.order_book.bids[:2] + stock_a.order_book.asks[:2]
        stock_b_deals = stock_b.order_book.bids[:2] + stock_b.order_book.asks[:2]

        inputs = {
            "date": date,
            "time": session,
            "cash": self.cash,
            "stock_a": self.holding_a,
            "stock_b": self.holding_b,
            "stock_a_price": stock_a.get_price(),
            "stock_b_price": stock_b.get_price(),
            "stock_a_deals": str(stock_a_deals),
            "stock_b_deals": str(stock_b_deals)
        }

        # Check for fiscal financial reporting periods
        if session == 1:
            if date in config.FINANCIAL_REPORT_DAYS:
                report_idx = config.FINANCIAL_REPORT_DAYS.index(date)
                inputs["stock_a_report"] = stock_a.gen_financial_report(report_idx)
                inputs["stock_b_report"] = stock_b.gen_financial_report(report_idx)
                prompt_col = PromptCollection(FIRST_DAY_FINANCIAL_REPORT, FIRST_DAY_BACKGROUND_KNOWLEDGE, SEASONAL_FINANCIAL_REPORT, DECIDE_BUY_STOCK_PROMPT)
            elif date == 1:
                prompt_col = PromptCollection(FIRST_DAY_FINANCIAL_REPORT, FIRST_DAY_BACKGROUND_KNOWLEDGE, DECIDE_BUY_STOCK_PROMPT)
            else:
                prompt_col = PromptCollection(BACKGROUND_PROMPT, DECIDE_BUY_STOCK_PROMPT)
        else:
            prompt_col = DECIDE_BUY_STOCK_PROMPT

        prompt = format_prompt(prompt_col, inputs)
        llm_response = self.query_llm(prompt)

        if llm_response is None:
            # Trigger rule-based trade execution
            return self._mock_trading_decision(stock_a.get_price(), stock_b.get_price())

        # Validate order compliance
        is_ok, err, order_data = self.compliance_parser.validate_market_order(
            llm_response, self.cash, self.holding_a, self.holding_b, stock_a.get_price(), stock_b.get_price()
        )
        
        retries = 0
        while not is_ok and retries < 2:
            retry_prompt = format_prompt(BUY_STOCK_RETRY_PROMPT, {"fail_response": err})
            llm_response = self.query_llm(retry_prompt)
            if llm_response is None:
                return self._mock_trading_decision(stock_a.get_price(), stock_b.get_price())
            is_ok, err, order_data = self.compliance_parser.validate_market_order(
                llm_response, self.cash, self.holding_a, self.holding_b, stock_a.get_price(), stock_b.get_price()
            )
            retries += 1

        if not is_ok:
            return self._mock_trading_decision(stock_a.get_price(), stock_b.get_price())

        return order_data

    def post_message(self):
        """
        Agent publishes brief updates on public forums.
        """
        if not self.is_active:
            return ""

        prompt = format_prompt(POST_MESSAGE_PROMPT, {})
        llm_response = self.query_llm(prompt)

        if llm_response is None:
            return self._mock_forum_post()

        return llm_response.strip().replace('"', '')

    def predict_next_day(self):
        """
        Forecast directional actions.
        """
        if not self.is_active:
            return {"buy_A": "no", "buy_B": "no", "sell_A": "no", "sell_B": "no", "loan": "no"}

        prompt = format_prompt(NEXT_DAY_ESTIMATE_PROMPT, {})
        llm_response = self.query_llm(prompt)

        if llm_response is None:
            return {"buy_A": "yes" if random.random() > 0.5 else "no", 
                    "buy_B": "yes" if random.random() > 0.5 else "no", 
                    "sell_A": "yes" if random.random() > 0.5 else "no", 
                    "sell_B": "yes" if random.random() > 0.5 else "no", 
                    "loan": "no"}

        is_ok, err, forecast = self.compliance_parser.validate_forecast(llm_response)
        retries = 0
        while not is_ok and retries < 2:
            retry_prompt = format_prompt(NEXT_DAY_ESTIMATE_RETRY, {"fail_response": err})
            llm_response = self.query_llm(retry_prompt)
            if llm_response is None:
                break
            is_ok, err, forecast = self.compliance_parser.validate_forecast(llm_response)
            retries += 1

        if not is_ok:
            return {"buy_A": "no", "buy_B": "no", "sell_A": "no", "sell_B": "no", "loan": "no"}

        return forecast

    # --- Financial Operations ---

    def pay_debt_liabilities(self, date):
        """
        Repays matured debt options. Bankrupts if insolvent.
        """
        if not self.is_active:
            return

        matured_loans = [loan for loan in self.loans if loan["repayment_date"] == date]
        for loan in matured_loans:
            duration = config.LOAN_DURATIONS[loan["loan_type"]]
            repayment_cost = loan["amount"] * (1 + duration["rate"])
            self.cash -= repayment_cost
            self.loans.remove(loan)

        if self.cash < 0:
            self.is_bankrupt = True

    def service_monthly_interests(self):
        """
        Deducts monthly interest costs.
        """
        if not self.is_active:
            return

        for loan in self.loans:
            duration = config.LOAN_DURATIONS[loan["loan_type"]]
            monthly_interest = (loan["amount"] * duration["rate"]) / 12.0
            self.cash -= monthly_interest

        if self.cash < 0:
            self.is_bankrupt = True

    def process_insolvency(self, price_a, price_b):
        """
        Liquidation of assets to recover from negative cash balances.
        """
        if not self.is_active:
            return False

        portfolio_assets = (self.holding_a * price_a) + (self.holding_b * price_b)
        if portfolio_assets + self.cash < 0:
            # Complete insolvency
            self.is_active = False
            self.is_bankrupt = True
            return True  # Trader has exited the market

        # Liquidate stock A first
        if price_a * self.holding_a >= -self.cash:
            sell_a = math.ceil(-self.cash / price_a)
            self.holding_a -= sell_a
            self.cash += sell_a * price_a
        else:
            self.cash += price_a * self.holding_a
            self.holding_a = 0
            
            # Liquidate stock B to cover the remainder
            sell_b = math.ceil(-self.cash / price_b)
            self.holding_b -= sell_b
            self.cash += sell_b * price_b

        self.is_bankrupt = False
        return False

    # --- Rule-Based Algorithmic Fallbacks (Mock Mode) ---

    def _mock_credit_decision(self, max_loan):
        """
        Mock rules based on persona risk constraints.
        """
        if self.persona == "Conservative":
            return {"loan": "no"}
        elif self.persona == "Aggressive":
            # Highly leveraged
            if random.random() < 0.6:
                return {"loan": "yes", "loan_type": 0, "amount": max_loan * 0.8}
        elif self.persona == "Balanced":
            if random.random() < 0.3:
                return {"loan": "yes", "loan_type": 1, "amount": max_loan * 0.3}
        elif self.persona == "Growth-Oriented":
            if random.random() < 0.4:
                return {"loan": "yes", "loan_type": 2, "amount": max_loan * 0.5}
        
        return {"loan": "no"}

    def _mock_trading_decision(self, price_a, price_b):
        """
        Technical/Persona-based mock trading.
        """
        decision_rand = random.random()
        
        # 30% hold rate
        if decision_rand < 0.3:
            return {"action_type": "no"}

        target_stock = "A" if random.random() < 0.5 else "B"
        price_target = price_a if target_stock == "A" else price_b
        holdings = self.holding_a if target_stock == "A" else self.holding_b

        # Persona biases
        if self.persona == "Conservative":
            target_stock = "A"  # Conservative prefers safer Stock A
            price_target = price_a
            holdings = self.holding_a
            action = "buy" if self.cash > (self.initial_net_worth * 0.2) and random.random() < 0.5 else "sell"
        elif self.persona == "Aggressive":
            target_stock = "B"  # Aggressive prefers growth Stock B
            price_target = price_b
            holdings = self.holding_b
            action = "buy" if self.cash > 1000 else "sell"
        else:
            action = "buy" if random.random() < 0.5 else "sell"

        # Limit price variation (-3% to +3%)
        variation = random.uniform(-0.03, 0.03)
        limit_price = round(price_target * (1 + variation), 2)
        if limit_price <= 0:
            limit_price = price_target

        if action == "buy":
            # Spend a fraction of available cash
            spending_cap = self.cash * random.uniform(0.1, 0.4)
            order_qty = int(spending_cap / limit_price)
            if order_qty <= 0:
                return {"action_type": "no"}
            return {
                "action_type": "buy",
                "stock": target_stock,
                "amount": order_qty,
                "price": limit_price
            }
        else:
            if holdings <= 0:
                return {"action_type": "no"}
            order_qty = int(holdings * random.uniform(0.1, 0.5))
            if order_qty <= 0:
                return {"action_type": "no"}
            return {
                "action_type": "sell",
                "stock": target_stock,
                "amount": order_qty,
                "price": limit_price
            }

    def _mock_forum_post(self):
        """
        Mock forum posts matching trader's persona.
        """
        conservative_posts = [
            "Market volatility seems high. I'm increasing my liquidity buffer and leaning on safe assets.",
            "Bond-like equity plays are looking much stronger today. Highly cautious about tech leverage."
        ]
        aggressive_posts = [
            "Asset growth is outstanding. Taking on maximum leverage to squeeze profits from this momentum!",
            "High growth Stock B is undervalued. Buying every dip with leverage. Shorts will burn."
        ]
        balanced_posts = [
            "Maintaining 50/50 balance sheets between blue-chip industrials and growth tech.",
            "Macro interest signals are mixed. Neutral outlook, executing standard options hedging."
        ]
        growth_posts = [
            "Bullish on technological expansion rates. Long-term fundamentals look excellent.",
            "Reallocating industrial manufacturing weights toward software services. The sector is moving fast."
        ]

        if self.persona == "Conservative":
            return random.choice(conservative_posts)
        elif self.persona == "Aggressive":
            return random.choice(aggressive_posts)
        elif self.persona == "Balanced":
            return random.choice(balanced_posts)
        else:
            return random.choice(growth_posts)
