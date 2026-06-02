from app.simulator import config

class LimitOrderBook:
    def __init__(self):
        # Bids (buys) are sorted descending by price, then ascending by time (FIFO)
        self.bids = []
        # Asks (sells) are sorted ascending by price, then ascending by time (FIFO)
        self.asks = []
        self.deal_history = []

    def clear(self):
        self.bids.clear()
        self.asks.clear()

    def add_order(self, order):
        # order is dict: {"agent": int, "action_type": "buy"|"sell", "amount": int, "price": float}
        if order["action_type"] == "buy":
            self.bids.append(order)
            self.bids.sort(key=lambda x: (-x["price"], x.get("timestamp", 0)))
        elif order["action_type"] == "sell":
            self.asks.append(order)
            self.asks.sort(key=lambda x: (x["price"], x.get("timestamp", 0)))

    def remove_order(self, order):
        if order in self.bids:
            self.bids.remove(order)
        elif order in self.asks:
            self.asks.remove(order)


class Stock:
    def __init__(self, name, initial_price):
        self.name = name
        self.price = initial_price
        self.history = {}  # date: list of deals in that day
        self.order_book = LimitOrderBook()
        self.session_deals = []  # deals in the current session

    def gen_financial_report(self, index):
        # Prevent index out of bounds
        idx = min(max(0, index), len(config.FINANCIAL_REPORTS_COMPANY_A) - 1)
        if self.name == "A":
            return config.FINANCIAL_REPORTS_COMPANY_A[idx]
        elif self.name == "B":
            return config.FINANCIAL_REPORTS_COMPANY_B[idx]
        return "No financial statement available for this security."

    def add_session_deal(self, deal):
        self.session_deals.append(deal)

    def update_price(self, date):
        if len(self.session_deals) == 0:
            return
        
        # Calculate volume weighted average price (VWAP) for realism or get the last deal price
        # We will use the last deal price for backward compatibility with price-chasing agents,
        # but VWAP is also a great analytical metric.
        self.price = self.session_deals[-1]["price"]
        
        if date not in self.history:
            self.history[date] = []
        self.history[date].extend(self.session_deals)
        self.session_deals.clear()

    def get_price(self):
        return self.price
