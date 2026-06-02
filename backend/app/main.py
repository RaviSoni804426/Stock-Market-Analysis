import os
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List

from app.simulator.engine import AegisSimulationEngine

app = FastAPI(
    title="AegisMarket API",
    description="REST interface for configuring, running, and stress-testing LLM-powered multi-agent financial simulations.",
    version="1.0.0"
)

# Enable CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global simulation engine state
engine = AegisSimulationEngine()

class StartSimulationRequest(BaseModel):
    agents: Optional[int] = 5
    days: Optional[int] = 10
    model: Optional[str] = "gemini-1.5-flash"

class ShockRequest(BaseModel):
    title: str
    message: str
    rates: Optional[List[float]] = [0.024, 0.027, 0.030]

@app.get("/api/simulation/config")
def get_current_config():
    """
    Returns baseline market config values.
    """
    return {
        "status": "active" if engine.is_running else "idle",
        "current_day": engine.current_day,
        "total_days": engine.total_days,
        "agent_count": len(engine.agents),
        "model_name": engine.model_name
    }

@app.post("/api/simulation/start")
def start_simulation(req: StartSimulationRequest):
    """
    Initializes and triggers the entire simulation run.
    For high dashboard performance and instant visual playback,
    runs the full simulation in a fast synchronous sweep and returns the complete logs.
    """
    try:
        engine.initialize_market(
            agent_count=req.agents,
            total_days=req.days,
            model_name=req.model
        )
        
        # Fast sweep execution
        has_more = True
        while has_more:
            has_more = engine.execute_one_day()
            
        summary = engine.recorder.get_summary()
        
        # Calculate summary metrics for the header cards
        prices_a = [s["price_a"] for s in summary["stocks"] if s["price_a"] > 0]
        prices_b = [s["price_b"] for s in summary["stocks"] if s["price_b"] > 0]
        total_trades = len(summary["trades"])
        
        net_worths = [a["net_worth"] for a in summary["agents"] if a["day"] == engine.total_days]
        if not net_worths:
            net_worths = [100000.0]
        avg_net_worth = sum(net_worths) / len(net_worths)
        
        outstanding_loans = sum(c["amount"] for c in summary["credit"] if c["action"] == "borrow")
        
        return {
            "success": True,
            "metrics": {
                "avg_price_a": round(sum(prices_a)/len(prices_a), 2) if prices_a else 30.0,
                "avg_price_b": round(sum(prices_b)/len(prices_b), 2) if prices_b else 40.0,
                "total_trades": total_trades,
                "avg_wealth": round(avg_net_worth, 2),
                "outstanding_debt": round(outstanding_loans, 2)
            },
            "data": summary
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/simulation/shock")
def inject_shock(req: ShockRequest):
    """
    Injects a credit/monetary scenario shock into the engine.
    """
    if not engine.is_running:
        raise HTTPException(status_code=400, detail="No active simulation is currently running.")
    
    engine.inject_custom_shock(
        title=req.title,
        message=req.message,
        rate_adjustments=req.rates
    )
    return {"success": True, "detail": f"Shock '{req.title}' successfully injected."}

@app.get("/api/simulation/results")
def get_simulation_results():
    """
    Exposes full in-memory logs for standard timeline charts.
    """
    return engine.recorder.get_summary()

# Mount frontend build static directory if running in host/prod mode
# Try multiple possible locations to find the built dashboard folder on dev and production
possible_dirs = [
    # Production Docker structure: /app/static relative to /app/app/main.py
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static"),
    # Local Development structure: root/static relative to root/backend/app/main.py
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "static"),
    # Absolute container fallback
    "/app/static"
]

static_dir = None
for d in possible_dirs:
    if os.path.exists(d) and os.path.isdir(d):
        static_dir = d
        break

if static_dir:
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
