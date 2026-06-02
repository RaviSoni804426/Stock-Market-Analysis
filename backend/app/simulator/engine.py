import random
from app.simulator import config
from app.simulator.order_book import Stock
from app.simulator.trader import AutonomousTrader
from app.simulator.parser import ComplianceParser
from app.simulator.recorder import MarketRecorder

class AegisSimulationEngine:
    """
    Orchestrates the entire multi-agent economy.
    Manages state, ticks days/sessions, processes order matching, 
    and handles macroeconomic interest rate shocks.
    """
    def __init__(self):
        self.compliance_parser = ComplianceParser()
        self.recorder = MarketRecorder()
        
        self.stock_a = None
        self.stock_b = None
        self.agents = []
        
        self.current_day = 0
        self.total_days = config.DEFAULT_TOTAL_DAYS
        self.agent_count = config.DEFAULT_AGENT_COUNT
        self.model_name = "gemini-1.5-flash"
        
        self.forum_messages = []
        self.active_scenarios = {}
        self.is_running = False

    def initialize_market(self, agent_count=None, total_days=None, model_name=None):
        self.recorder.reset()
        
        self.agent_count = agent_count or config.DEFAULT_AGENT_COUNT
        self.total_days = total_days or config.DEFAULT_TOTAL_DAYS
        self.model_name = model_name or "gemini-1.5-flash"
        
        self.stock_a = Stock("A", config.INITIAL_PRICE_A)
        self.stock_b = Stock("B", config.INITIAL_PRICE_B)
        
        # Load preset events
        self.active_scenarios = config.DEFAULT_SCENARIOS.copy()
        
        # Initialize traders
        self.agents = []
        for idx in range(self.agent_count):
            self.agents.append(
                AutonomousTrader(
                    idx=idx,
                    initial_price_a=config.INITIAL_PRICE_A,
                    initial_price_b=config.INITIAL_PRICE_B,
                    compliance_parser=self.compliance_parser,
                    model_name=self.model_name
                )
            )
            
        self.current_day = 1
        self.forum_messages = []
        self.is_running = True

    def inject_custom_shock(self, title, message, rate_adjustments=None):
        """
        Injects a dynamic macro event scenario during the execution.
        """
        day_key = self.current_day + 1
        self.active_scenarios[day_key] = {
            "title": title,
            "message": message,
            "rates": rate_adjustments or [0.025, 0.028, 0.031]
        }
        self.recorder.record_scenario_injection(self.current_day, title, message)

    def execute_one_day(self):
        """
        Runs one full day of trading simulation, including debt checks, session trading, and social posting.
        """
        if not self.is_running or self.current_day > self.total_days:
            self.is_running = False
            return False

        day = self.current_day
        
        # 1. Debt Settlement & Repayment Checks
        for agent in self.agents:
            if not agent.is_active:
                continue
            agent.pay_debt_liabilities(day)

        # 2. Monthly Debt Interest Collection
        # Repayment days occur every 22 days (repayment cycle)
        if day > 1 and day % config.REPAYMENT_CYCLE_DAYS == 0:
            for agent in self.agents:
                if agent.is_active:
                    agent.service_monthly_interests()

        # 3. Insolvency Liquidations
        for agent in self.agents:
            if agent.is_active and agent.cash < 0:
                is_liquidated = agent.process_insolvency(self.stock_a.get_price(), self.stock_b.get_price())
                if is_liquidated:
                    # Agent went fully broke, remove cash values
                    agent.is_active = False

        # 4. Macroeconomic Shock Events
        if day in self.active_scenarios:
            scenario = self.active_scenarios[day]
            # Adjust benchmark lending rates in config
            config.LOAN_DURATIONS[0]["rate"] = scenario["rates"][0]
            config.LOAN_DURATIONS[1]["rate"] = scenario["rates"][1]
            config.LOAN_DURATIONS[2]["rate"] = scenario["rates"][2]
            
            # Post event details directly to the forum feed
            self.forum_messages.append({
                "agent_id": -1, # Admin/Macro
                "persona": "Macroeconomics",
                "message": f"SYSTEM EVENT: {scenario['title']} - {scenario['message']}"
            })
            self.recorder.record_scenario_injection(day, scenario["title"], scenario["message"])

        # 5. Leverage Allocation (Loans)
        # compile last day's messages for LLM inputs
        lastday_text = "\n".join([f"Trader {m['agent_id']} ({m['persona']}): {m['message']}" for m in self.forum_messages])
        
        for agent in self.agents:
            if not agent.is_active:
                continue
            loan_res = agent.plan_loan(day, self.stock_a.get_price(), self.stock_b.get_price(), lastday_text)
            if loan_res.get("loan") == "yes":
                self.recorder.record_credit_event(day, agent.id, "borrow", loan_res["amount"], loan_res["loan_type"])

        # 6. Session Trading Intervals
        for session in range(1, config.SESSIONS_PER_DAY + 1):
            self.stock_a.order_book.clear()
            self.stock_b.order_book.clear()
            
            # Capture snapshots before session
            for agent in self.agents:
                if agent.is_active:
                    snap = agent.get_portfolio_snapshot(self.stock_a.get_price(), self.stock_b.get_price())
                    self.recorder.record_agent_snapshot(day, session, agent.id, agent.persona, snap)

            # Gather orders
            sequence = list(range(len(self.agents)))
            random.shuffle(sequence)
            
            for idx in sequence:
                agent = self.agents[idx]
                if not agent.is_active:
                    continue
                
                order = agent.plan_stock_order(day, session, self.stock_a, self.stock_b)
                if order.get("action_type") in ["buy", "sell"]:
                    order["agent"] = agent.id
                    order["timestamp"] = random.random()
                    
                    # Queue order in respective book
                    if order["stock"] == "A":
                        self.stock_a.order_book.add_order(order)
                    else:
                        self.stock_b.order_book.add_order(order)

            # Match Orders (Continuous Double Auction)
            self._match_order_books(day, session)
            
            # Conclude session, update pricing indices
            self.stock_a.update_price(day)
            self.stock_b.update_price(day)
            
            self.recorder.record_stock_prices(day, session, self.stock_a.get_price(), self.stock_b.get_price())

        # 7. Close of Day Forecasts & Community Postings
        new_forum_messages = []
        for agent in self.agents:
            if not agent.is_active:
                continue
            
            # Forecast tomorrow's moves
            forecast = agent.predict_next_day()
            
            # Compile social posts
            post = agent.post_message()
            if post:
                new_forum_messages.append({
                    "agent_id": agent.id,
                    "persona": agent.persona,
                    "message": post
                })
                self.recorder.record_forum_post(day, agent.id, agent.persona, post)
                
            # Clear daily context history to avoid token overflows
            agent.chat_history.clear()

        # Update active intelligence feed
        self.forum_messages = new_forum_messages
        self.current_day += 1
        
        if self.current_day > self.total_days:
            self.is_running = False
            self.recorder.export_to_json()

        return True

    def _match_order_books(self, day, session):
        """
        Executes bid-ask order book matching (Continuous Double Auction).
        Locks fills when bid_price >= ask_price, transferring inventories and credits.
        """
        for stock in [self.stock_a, self.stock_b]:
            book = stock.order_book
            
            # Match highest bid to lowest ask
            while book.bids and book.asks:
                highest_bid = book.bids[0]
                lowest_ask = book.asks[0]
                
                # Check execution criteria
                if highest_bid["price"] >= lowest_ask["price"]:
                    buyer = self.agents[highest_bid["agent"]]
                    seller = self.agents[lowest_ask["agent"]]
                    
                    # Execution price is determined by the order placed first (maker price)
                    # We will use the average of the bid/ask or the maker price (the order with earlier timestamp)
                    if highest_bid["timestamp"] < lowest_ask["timestamp"]:
                        execution_price = highest_bid["price"]
                    else:
                        execution_price = lowest_ask["price"]
                        
                    fill_amount = min(highest_bid["amount"], lowest_ask["amount"])
                    
                    # Process Balance Sheets
                    buyer.cash -= fill_amount * execution_price
                    seller.cash += fill_amount * execution_price
                    
                    if stock.name == "A":
                        buyer.holding_a += fill_amount
                        seller.holding_a -= fill_amount
                    else:
                        buyer.holding_b += fill_amount
                        seller.holding_b -= fill_amount
                        
                    # Log Transaction
                    stock.add_session_deal({"price": execution_price, "amount": fill_amount})
                    self.recorder.record_trade(
                        day, session, stock.name, buyer.id, seller.id, fill_amount, execution_price
                    )
                    
                    # Update Book Limits
                    highest_bid["amount"] -= fill_amount
                    lowest_ask["amount"] -= fill_amount
                    
                    if highest_bid["amount"] == 0:
                        book.bids.pop(0)
                    if lowest_ask["amount"] == 0:
                        book.asks.pop(0)
                else:
                    break  # Spread is negative, no more matches possible today
