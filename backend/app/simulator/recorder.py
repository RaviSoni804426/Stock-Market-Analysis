import os
import json

class MarketRecorder:
    """
    Saves high-frequency multi-agent execution results, 
    compiling comprehensive analytical datasets for real-time dashboard plotting.
    """
    def __init__(self):
        self.reset()

    def reset(self):
        self.stock_history = []  # [{"day", "session", "price_A", "price_B"}]
        self.trade_history = []  # [{"day", "session", "ticker", "buyer", "seller", "amount", "price"}]
        self.agent_history = []  # [{"day", "session", "agent_id", "persona", "net_worth", "cash", "a_val", "b_val", "debt"}]
        self.credit_history = []  # [{"day", "agent_id", "loan_action", "amount", "duration"}]
        self.forum_history = []  # [{"day", "agent_id", "persona", "message"}]
        self.scenario_injections = [] # [{"day", "title", "message"}]

    def record_stock_prices(self, day, session, price_a, price_b):
        self.stock_history.append({
            "day": day,
            "session": session,
            "price_a": round(price_a, 2),
            "price_b": round(price_b, 2)
        })

    def record_trade(self, day, session, ticker, buyer_id, seller_id, amount, price):
        self.trade_history.append({
            "day": day,
            "session": session,
            "ticker": ticker,
            "buyer": buyer_id,
            "seller": seller_id,
            "amount": amount,
            "price": round(price, 2)
        })

    def record_agent_snapshot(self, day, session, agent_id, persona, snapshot):
        self.agent_history.append({
            "day": day,
            "session": session,
            "agent_id": agent_id,
            "persona": persona,
            "net_worth": round(snapshot["net_worth"], 2),
            "cash": round(snapshot["cash"], 2),
            "a_val": round(snapshot["stock_a_value"], 2),
            "b_val": round(snapshot["stock_b_value"], 2),
            "debt": round(snapshot["debt"], 2)
        })

    def record_credit_event(self, day, agent_id, action, amount, duration):
        self.credit_history.append({
            "day": day,
            "agent_id": agent_id,
            "action": action,
            "amount": round(amount, 2),
            "duration": duration
        })

    def record_forum_post(self, day, agent_id, persona, message):
        self.forum_history.append({
            "day": day,
            "agent_id": agent_id,
            "persona": persona,
            "message": message
        })

    def record_scenario_injection(self, day, title, message):
        self.scenario_injections.append({
            "day": day,
            "title": title,
            "message": message
        })

    def get_summary(self):
        """
        Aggregates logs for easy dashboard rendering.
        """
        return {
            "stocks": self.stock_history,
            "trades": self.trade_history,
            "agents": self.agent_history,
            "credit": self.credit_history,
            "forum": self.forum_history,
            "scenarios": self.scenario_injections
        }

    def export_to_json(self, file_path="res/simulation_run.json"):
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, "w") as f:
            json.dump(self.get_summary(), f, indent=2)
