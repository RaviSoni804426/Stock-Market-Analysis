import os

# API Keys (loaded dynamically from environment)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY", os.getenv("GEMINI_API_KEY", ""))

# Core Simulation Constants (configurable)
DEFAULT_AGENT_COUNT = 5
DEFAULT_TOTAL_DAYS = 15
SESSIONS_PER_DAY = 3

# Asset Pricing
INITIAL_PRICE_A = 30.0
INITIAL_PRICE_B = 40.0

# Agent Wealth Constraints
MAX_INITIAL_WEALTH = 1000000.0
MIN_INITIAL_WEALTH = 100000.0

# Debt & Credit Markets
LOAN_DURATIONS = {
    0: {"name": "22-Day Short Term", "days": 22, "rate": 0.027},
    1: {"name": "44-Day Medium Term", "days": 44, "rate": 0.030},
    2: {"name": "66-Day Long Term", "days": 66, "rate": 0.033}
}

REPAYMENT_CYCLE_DAYS = 22  # Interest payment intervals

# Financial Reporting Cycles
SEASONAL_CYCLE_DAYS = 66
FINANCIAL_REPORT_DAYS = [12, 78, 144, 210]

# Corporate Disclosures
FINANCIAL_REPORTS_COMPANY_A = [
    "Revenue growth rate (YoY): 9.49%, Revenue: $4,483.99M, Gross margin: 41.05%, Effective Tax: 11.31%, SG&A Expense Rate: 6.83%, R&D Expense Rate: 3.83%, Net profit: $856.67M, Depreciation & Amortization: 0.91%, CapEx: 2.30%, Operating Cash Flow: $756.75M",
    "Revenue growth rate (YoY): 7.38%, Revenue: $4,417.79M, Gross margin: 35.68%, Effective Tax: 11.75%, SG&A Expense Rate: 8.13%, R&D Expense Rate: 4.62%, Net profit: $493.94M, Depreciation & Amortization: 1.34%, CapEx: 2.68%, Operating Cash Flow: $396.53M",
    "Revenue growth rate (YoY): 8.70%, Revenue: $4,041.30M, Gross margin: 37.45%, Effective Tax: 9.34%, SG&A Expense Rate: 6.79%, R&D Expense Rate: 3.41%, Net profit: $724.36M, Depreciation & Amortization: 1.27%, CapEx: 2.44%, Operating Cash Flow: $639.53M",
    "Revenue growth rate (YoY): 7.75%, Revenue: $5,024.04M, Gross margin: 42.47%, Effective Tax: 10.67%, SG&A Expense Rate: 6.56%, R&D Expense Rate: 4.72%, Net profit: $1,031.21M, Depreciation & Amortization: 1.08%, CapEx: 2.71%, Operating Cash Flow: $945.50M"
]

FINANCIAL_REPORTS_COMPANY_B = [
    "Revenue growth rate (YoY): 19.96%, Revenue: $1,319.94M, Gross margin: 31.21%, Effective Tax: 0.70%, SG&A Expense Rate: 4.69%, R&D Expense Rate: 8.78%, Net profit: $224.91M, Depreciation & Amortization: 1.13%, CapEx: 1.77%, Operating Cash Flow: $208.72M",
    "Revenue growth rate (YoY): 19.86%, Revenue: $1,096.70M, Gross margin: 31.26%, Effective Tax: 0.71%, SG&A Expense Rate: 3.62%, R&D Expense Rate: 9.90%, Net profit: $186.76M, Depreciation & Amortization: 0.67%, CapEx: 1.44%, Operating Cash Flow: $181.68M",
    "Revenue growth rate (YoY): 18.21%, Revenue: $1,676.70M, Gross margin: 31.58%, Effective Tax: 0.92%, SG&A Expense Rate: 3.78%, R&D Expense Rate: 10.27%, Net profit: $278.33M, Depreciation & Amortization: 0.77%, CapEx: 1.56%, Operating Cash Flow: $266.14M",
    "Revenue growth rate (YoY): 15.98%, Revenue: $1,075.13M, Gross margin: 32.41%, Effective Tax: 1.08%, SG&A Expense Rate: 3.79%, R&D Expense Rate: 10.70%, Net profit: $181.16M, Depreciation & Amortization: 1.09%, CapEx: 2.28%, Operating Cash Flow: $161.19M"
]

# Macroeconomic Shock Event Scenarios
DEFAULT_SCENARIOS = {
    78: {
        "title": "Central Bank Liquidity Injection (Rate Cut)",
        "message": "The Central Bank announced a surprise 50 bps interest rate cut to bolster credit markets. Commercial bank lending rates have been lowered.",
        "rates": [0.024, 0.027, 0.030]
    },
    144: {
        "title": "Inflationary Control (Rate Hike)",
        "message": "To curb rising domestic inflation, the Federal Reserve has enacted an interest rate hike of 25 bps across all maturities.",
        "rates": [0.0255, 0.0285, 0.0315]
    }
}
