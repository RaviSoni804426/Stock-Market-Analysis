from app.simulator.prompt_builder import PromptBlock, PromptVariable, PromptCollection

BACKGROUND_PROMPT = PromptBlock(
    name="System Context",
    content="""
You are an institutional financial trader operating within AegisMarket, a real-time autonomous simulation. 
You interact with other high-frequency algorithmic traders and make daily asset allocation decisions.
There are currently two securities traded on the exchange:
- **Ticker: A**: A mature, chemical manufacturing firm. Relatively low volatility, stable fundamentals, but facing structural changes.
- **Ticker: B**: A high-growth, high-risk technology enterprise with volatile returns and expansion possibilities.

You must optimize your long-term portfolio valuation using strategic trading, capital allocation, and credit facilities.
"""
)

LASTDAY_FORUM_AND_STOCK_PROMPT = PromptBlock(
    name="Market Intelligence Feed",
    content="""
At yesterday's close of exchange:
- Stock A closed at: ${stock_a_price:.2f}
- Stock B closed at: ${stock_b_price:.2f}

The trading community published the following brief summaries and posts on the shared forum:
{lastday_forum_message}
"""
)

LOAN_TYPE_PROMPT = PromptVariable(
    refname="loan_type_prompt",
    name="Credit Facility Offerings",
    content="""
- Option [0]: 22-Day Short-Term Debt at {loan_rate1:.2%} interest rate.
- Option [1]: 44-Day Mid-Term Debt at {loan_rate2:.2%} interest rate.
- Option [2]: 66-Day Long-Term Debt at {loan_rate3:.2%} interest rate.
"""
)

DECIDE_IF_LOAN_PROMPT = PromptBlock(
    name="Credit Allocation Protocol",
    content="""
Simulation Day: {date}
Your Agent Profile / Risk-Persona: {character}

Your current balance sheet:
- Shareholding A: {stock_a} shares
- Shareholding B: {stock_b} shares
- Liquid Capital (Cash): ${cash:.2f}
- Debt Liabilities: {debt}

You must evaluate whether to secure additional leverage. 
Leverage allows you to amplify buying power but exposes you to repayment interest and insolvency defaults.
Available credit terms are listed in the Credit Facility Offerings section.
Your maximum borrowing capacity today is limited to: ${max_loan:.2f}.

Output your credit decision exactly in the following raw JSON format:
{
  "loan": "yes",
  "loan_type": 0,
  "amount": 50000
}
If you do not require any leverage/debt today, return:
{
  "loan": "no"
}
Do not write any commentary, explanation, or text other than the raw JSON object.
"""
)

LOAN_RETRY_PROMPT = PromptBlock(
    name="Credit Allocation Protocol Retry",
    content="""
The system rejected your previous credit selection due to the following parsing or compliance errors:
{fail_response}

Please re-evaluate and return a compliant JSON object immediately.
Example:
{
  "loan": "yes",
  "loan_type": 0,
  "amount": 25000
}
Or:
{
  "loan": "no"
}
Do not include any extra words. Just the JSON object.
"""
)

DECIDE_BUY_STOCK_PROMPT = PromptBlock(
    name="Exchange Order Protocol",
    content="""
Simulation Day: {date} | Trading Session Tick: {time}
Current Asset Prices:
- Share A: ${stock_a_price:.2f}
- Share B: ${stock_b_price:.2f}

Active Order Book Bids/Asks (Unfilled orders from other traders):
- Book A: {stock_a_deals}
- Book B: {stock_b_deals}

Your Position:
- Liquid Capital (Cash): ${cash:.2f}
- Holding Stock A: {stock_a} shares
- Holding Stock B: {stock_b} shares

You must execute a trading decision to maximize your capital. 
You can buy shares (if you have cash), sell shares (if you have inventory), or pass (no transaction).
To participate, place a limit order in the exchange queue.
Note: You are strongly encouraged to actively trade to adjust your exposures based on market fluctuations!

Output your order decision exactly in one of the following JSON formats:
For Buy Limit:
{
  "action_type": "buy",
  "stock": "A",
  "amount": 100,
  "price": 30.5
}
For Sell Limit:
{
  "action_type": "sell",
  "stock": "B",
  "amount": 50,
  "price": 41.2
}
To skip this trading window:
{
  "action_type": "no"
}
The "amount" must be an integer. The "price" can be a float.
Do not write any other characters, markdown blocks, or text besides the raw JSON object.
"""
)

BUY_STOCK_RETRY_PROMPT = PromptBlock(
    name="Exchange Order Protocol Retry",
    content="""
The exchange matched engine failed to parse or execute your order due to compliance errors:
{fail_response}

Please re-submit your order with valid balances and prices.
Example:
{
  "action_type": "buy",
  "stock": "A",
  "amount": 10,
  "price": 31.0
}
Or:
{
  "action_type": "no"
}
Do not write extra text. Provide only the JSON object.
"""
)

FIRST_DAY_FINANCIAL_REPORT = PromptVariable(
    refname="first_day_financial_prompt",
    name="Historical Core Financial Statements",
    content="""
A comprehensive summary of corporate performance across the last 12 fiscal quarters:
---
Securities Ticker: A
- Quarterly Revenues ($M): [3696, 3578, 3595, 3215, 3973, 3810, 3840, 3433, 4344, 4095, 4114, 3717]
- Net Profit ($M): [127.7, 218.0, 360.8, 358.1, 650.9, 693.3, 433.2, 517.1, 712.7, 628.3, 250.5, 325.5]
- Operating Cash Flows ($M): [30.1, 135.4, 344.3, 279.6, 564.6, 642.8, 350.4, 493.4, 650.7, 579.0, 185.7, 273.1]
---
Securities Ticker: B
- Quarterly Revenues ($M): [570, 774, 643, 995, 684, 934, 782, 1204, 788, 1100, 915, 1418]
- Net Profit ($M): [86.0, 142.1, 87.5, 135.8, 132.8, 169.7, 194.9, 272.1, 225.2, 356.7, 216.4, 345.7]
- Operating Cash Flows ($M): [69.0, 90.2, 82.2, 124.8, 75.5, 123.5, 132.7, 153.8, 194.9, 261.1, 216.4, 345.7]
"""
)

FIRST_DAY_BACKGROUND_KNOWLEDGE = PromptBlock(
    name="Securities Background Dossier",
    content="""
Here is confidential market intelligence about both issuers:

**Issuer A (Stable Manufacturing/Industrial Sector)**
- Listed for over a decade. Represents a deeply rooted corporate presence in primary chemicals and industrials.
- Operations hit macro bottlenecks recently, leading to slow topline growth.
- A strategic CEO replacement has energized leadership, driving a transition to digitalized operations and supply-chain efficiency. Projections point to positive structural shifts.

**Issuer B (Tech & Business Services Sector)**
- Newly listed (3 years). Enjoys hyper-growth cycles and strong expansion rates.
- Some tech sector macro headwind caused minor revenue dips last quarter, but overall structural growth remains intact.
- Latest reports show they are expanding market shares with 20%+ expected growth rates. Short-term prospects are highly positive.
- *Cautionary Note*: Regulatory compliance audits have investigated allegations of aggressive revenue recognition prior to its IPO, leaving minor integrity concerns in financial statements.

Both companies have recently signed state subsidies and community-enrichment programs with municipal authorities, stabilizing their basic operating risks.
"""
)

SEASONAL_FINANCIAL_REPORT = PromptVariable(
    refname="seasonal_financial_report",
    name="Active Fiscal Disclosures",
    content="""
Latest seasonal reports published by the corporations:
- Company A: {stock_a_report}
- Company B: {stock_b_report}
"""
)

POST_MESSAGE_PROMPT = PromptBlock(
    refname="post_message",
    name="Shared Forum Post Dispatch",
    content="""
The exchange session has concluded. You are preparing to write a brief social update or analytical summary on the shared market forum.
Your post will be public and seen by all other market participants, affecting their future beliefs and sentiment.

Write a 1-2 sentence analytical statement summarizing your market outlook, trading strategy, or evaluation of current prices.
Do not output JSON, headers, or instructions. Output ONLY your message text.
"""
)

NEXT_DAY_ESTIMATE_PROMPT = PromptBlock(
    refname="next_day_estimate",
    name="Forecasting Matrix",
    content="""
Analyze the market's activity and forum updates. Express your directional estimates for your activities tomorrow.
Output your predictions strictly in the following JSON format:
{
  "buy_A": "yes",
  "buy_B": "no",
  "sell_A": "yes",
  "sell_B": "no",
  "loan": "yes"
}
Provide strictly the raw JSON structure, without formatting, markdown elements, or extra text.
"""
)

NEXT_DAY_ESTIMATE_RETRY = PromptBlock(
    refname="next_day_estimate_retry",
    name="Forecasting Matrix Retry",
    content="""
Your previous directional forecasting JSON was malformed:
{fail_response}

Please re-generate using standard JSON:
{
  "buy_A": "yes",
  "buy_B": "no",
  "sell_A": "no",
  "sell_B": "no",
  "loan": "no"
}
Provide strictly raw JSON only.
"""
)
