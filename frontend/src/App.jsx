import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, RefreshCw, AlertTriangle, ShieldAlert, Cpu, 
  TrendingUp, Users, DollarSign, Wallet, ArrowRight, MessageSquare, 
  Sparkles, Sliders, Layers, ChevronRight, Zap
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, 
  CartesianGrid, Legend, BarChart, Bar, LineChart, Line
} from 'recharts';

export default function App() {
  // Input parameters
  const [agents, setAgents] = useState(5);
  const [days, setDays] = useState(10);
  const [model, setModel] = useState('gemini-1.5-flash');
  const [loading, setLoading] = useState(false);
  const [simulationData, setSimulationData] = useState(null);
  
  // Playback timeline controller states
  const [playIndex, setPlayIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = useRef(null);

  // Shock Injection Form
  const [shockTitle, setShockTitle] = useState('Regulatory Action');
  const [shockMessage, setShockMessage] = useState('Government has initiated structural inquiries regarding Issuer B pre-IPO balance disclosures.');
  const [shockSuccess, setShockSuccess] = useState(false);

  // Default demo data for instant dashboard load
  useEffect(() => {
    loadMockDemoData();
  }, []);

  // Cleanup playback on unmount
  useEffect(() => {
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, []);

  // Auto-play timeline tick
  useEffect(() => {
    if (isPlaying && simulationData) {
      playIntervalRef.current = setInterval(() => {
        setPlayIndex((prev) => {
          const maxSnapshots = simulationData.stocks.length - 1;
          if (prev >= maxSnapshots) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 800);
    } else {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, simulationData]);

  // Starts the simulation via FastAPI
  const runSimulation = async () => {
    setLoading(true);
    setIsPlaying(false);
    setPlayIndex(0);
    try {
      const res = await fetch('/api/simulation/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agents, days, model }),
      });
      const result = await res.json();
      if (result.success) {
        setSimulationData(result.data);
      } else {
        alert("Backend failed to run simulation. Ensure server is up.");
      }
    } catch (e) {
      console.warn("Connection to FastAPI failed, rendering advanced local synthetic simulation.", e);
      generateAdvancedMockSimulation();
    } finally {
      setLoading(false);
    }
  };

  // Injects macroeconomic shocks
  const injectShock = async () => {
    try {
      const res = await fetch('/api/simulation/shock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: shockTitle, message: shockMessage }),
      });
      const result = await res.json();
      if (result.success) {
        setShockSuccess(true);
        setTimeout(() => setShockSuccess(false), 3000);
      }
    } catch (e) {
      // Local mock injection for static display
      if (simulationData) {
        const activeSnap = simulationData.stocks[playIndex] || { day: 1 };
        const newEvent = {
          day: activeSnap.day,
          title: shockTitle,
          message: shockMessage
        };
        const updatedData = { ...simulationData };
        updatedData.scenarios.push(newEvent);
        updatedData.forum.unshift({
          day: activeSnap.day,
          agent_id: -1,
          persona: "Macroeconomics",
          message: `CRITICAL DIRECTIVE: ${shockTitle} - ${shockMessage}`
        });
        setSimulationData(updatedData);
        setShockSuccess(true);
        setTimeout(() => setShockSuccess(false), 3000);
      }
    }
  };

  // Loads high fidelity pre-calculated local walk for instant review
  const loadMockDemoData = () => {
    const demo = generateLocalSimulationData(8, 6);
    setSimulationData(demo);
    setPlayIndex(0);
  };

  const generateAdvancedMockSimulation = () => {
    const demo = generateLocalSimulationData(days, agents);
    setSimulationData(demo);
    setPlayIndex(0);
  };

  // Generates beautifully clean, highly dynamic synthetic timeline matching order books
  function generateLocalSimulationData(totalDays, totalAgents) {
    const stocks = [];
    const trades = [];
    const agentsLog = [];
    const credit = [];
    const forum = [];
    const scenarios = [
      { day: 3, title: "Reserve Requirement Ratio Cut", message: "Monetary policy easing has increased lending capabilities." }
    ];

    let priceA = 30.0;
    let priceB = 40.0;
    
    // Create initial agent portfolios
    const agentsProfiles = Array.from({ length: totalAgents }, (_, i) => {
      const personas = ["Conservative", "Aggressive", "Balanced", "Growth-Oriented"];
      return {
        id: i,
        persona: personas[i % personas.length],
        cash: 250000 + Math.random() * 300000,
        holdingA: 1000 + Math.floor(Math.random() * 500),
        holdingB: 500 + Math.floor(Math.random() * 300),
        debt: 20000 + Math.floor(Math.random() * 50000)
      };
    });

    // Tick through days and sessions
    for (let day = 1; day <= totalDays; day++) {
      
      // Credit check
      agentsProfiles.forEach((agent) => {
        if (day === 3 && agent.persona === "Aggressive") {
          const amt = 80000;
          agent.debt += amt;
          agent.cash += amt;
          credit.push({ day, agent_id: agent.id, action: "borrow", amount: amt, duration: 0 });
        }
      });

      for (let session = 1; session <= 3; session++) {
        // Simple random walk for prices
        const changeA = (Math.random() - 0.48) * 1.5; // slight upward tilt
        const changeB = (Math.random() - 0.46) * 3.0; // higher volatility
        
        priceA = Math.max(5, priceA + changeA);
        priceB = Math.max(5, priceB + changeB);

        stocks.push({
          day,
          session,
          price_a: round(priceA),
          price_b: round(priceB)
        });

        // Simulate transactions
        agentsProfiles.forEach((buyer, bIdx) => {
          const seller = agentsProfiles[(bIdx + 1) % totalAgents];
          const trdQty = 10 + Math.floor(Math.random() * 40);
          const executionPrice = round(Math.random() > 0.5 ? priceA : priceB);
          const ticker = executionPrice === priceA ? "A" : "B";

          if (buyer.cash > trdQty * executionPrice) {
            buyer.cash -= trdQty * executionPrice;
            seller.cash += trdQty * executionPrice;
            if (ticker === "A") {
              buyer.holdingA += trdQty;
              seller.holdingA -= trdQty;
            } else {
              buyer.holdingB += trdQty;
              seller.holdingB -= trdQty;
            }
            trades.push({
              day,
              session,
              ticker,
              buyer: buyer.id,
              seller: seller.id,
              amount: trdQty,
              price: executionPrice
            });
          }
        });

        // Record agent snap
        agentsProfiles.forEach((a) => {
          const a_val = a.holdingA * priceA;
          const b_val = a.holdingB * priceB;
          const net_worth = a_val + b_val + a.cash - a.debt;
          agentsLog.push({
            day,
            session,
            agent_id: a.id,
            persona: a.persona,
            net_worth: round(net_worth),
            cash: round(a.cash),
            a_val: round(a_val),
            b_val: round(b_val),
            debt: round(a.debt)
          });
        });
      }

      // Forum Messages
      agentsProfiles.forEach((agent) => {
        const posts = {
          "Conservative": `Increased safe positioning in Ticker A. Retaining substantial liquid buffers today.`,
          "Aggressive": `Amplified long exposure on tech asset B. Perfect momentum setup. High conviction trade!`,
          "Balanced": `Rebalanced security layers at ${round(priceA)} and ${round(priceB)} respectively. Stable outlook.`,
          "Growth-Oriented": `Optimistic about technology industry tailwinds. Incremental additions to Stock B.`
        };
        forum.push({
          day,
          agent_id: agent.id,
          persona: agent.persona,
          message: posts[agent.persona]
        });
      });
    }

    return { stocks, trades, agents: agentsLog, credit, forum, scenarios };
  }

  function round(v) {
    return Math.round(v * 100) / 100;
  }

  if (!simulationData) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0B0F19]">
        <div className="text-center">
          <RefreshCw className="mx-auto h-12 w-12 animate-spin text-indigo-500" />
          <h2 className="mt-4 font-semibold text-slate-100">Initializing AegisMarket Space...</h2>
        </div>
      </div>
    );
  }

  // Active playing index snapshot data
  const currentSnapshot = simulationData.stocks[playIndex] || { day: 1, session: 1, price_a: 30, price_b: 40 };
  const { day: activeDay, session: activeSession } = currentSnapshot;

  // Filter lists to active day & session tick
  const filteredStocks = simulationData.stocks.slice(0, playIndex + 1);
  const activeStockPrices = filteredStocks.map((s, i) => ({
    tick: `D${s.day} S${s.session}`,
    StockA: s.price_a,
    StockB: s.price_b
  }));

  const activeTrades = simulationData.trades.filter(
    (t) => (t.day < activeDay) || (t.day === activeDay && t.session <= activeSession)
  );

  const activeAgentSnaps = simulationData.agents.filter(
    (a) => a.day === activeDay && a.session === activeSession
  );

  const activeCreditLogs = simulationData.credit.filter((c) => c.day <= activeDay);
  const activeForumPosts = simulationData.forum.filter((f) => f.day === activeDay);
  const activeScenarios = simulationData.scenarios.filter((s) => s.day <= activeDay);

  // Aggregated card metrics computed from timeline snapshots
  const totalLeverageIssued = activeCreditLogs.reduce((acc, c) => acc + c.amount, 0);
  const marketVolatilityIndex = round(
    activeStockPrices.length > 1
      ? Math.abs(currentSnapshot.price_a - activeStockPrices[0].StockA) + 
        Math.abs(currentSnapshot.price_b - activeStockPrices[0].StockB)
      : 2.4
  );

  // Wealth distributions for equity bars
  const agentWealthData = activeAgentSnaps.map((a) => ({
    name: `Trader ${a.agent_id} (${a.persona.slice(0,4)}.)`,
    Wealth: a.net_worth,
    Cash: a.cash,
    Debt: a.debt
  }));

  return (
    <div className="min-h-screen bg-[#0B0F19] text-[#E2E8F0] pb-12">
      
      {/* 1. Sleek Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-[rgba(99,102,241,0.15)] bg-[#0B0F19]/90 backdrop-blur-md px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gradient-to-tr from-indigo-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <ShieldAlert className="h-6 w-6 text-white floating-icon" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              AegisMarket <span className="text-xs bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 font-semibold px-2 py-0.5 rounded-full">Simulator</span>
            </h1>
            <p className="text-xs text-slate-400">LLM Multi-Agent Market Stress-Testing Cockpit</p>
          </div>
        </div>

        {/* Dynamic Controls panel */}
        <div className="flex items-center gap-4 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2 px-3">
            <span className="text-xs text-slate-400">Agents:</span>
            <select 
              value={agents} 
              onChange={(e) => setAgents(Number(e.target.value))}
              className="bg-slate-800 text-slate-200 border-none outline-none text-xs font-semibold rounded px-1 py-0.5"
            >
              <option value={3}>3 Traders</option>
              <option value={5}>5 Traders</option>
              <option value={10}>10 Traders</option>
            </select>
          </div>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-2 px-3">
            <span className="text-xs text-slate-400">Days:</span>
            <select 
              value={days} 
              onChange={(e) => setDays(Number(e.target.value))}
              className="bg-slate-800 text-slate-200 border-none outline-none text-xs font-semibold rounded px-1 py-0.5"
            >
              <option value={5}>5 Days</option>
              <option value={10}>10 Days</option>
              <option value={15}>15 Days</option>
            </select>
          </div>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-2 px-3">
            <span className="text-xs text-slate-400">Model:</span>
            <select 
              value={model} 
              onChange={(e) => setModel(e.target.value)}
              className="bg-slate-800 text-slate-200 border-none outline-none text-xs font-semibold rounded px-1 py-0.5"
            >
              <option value="gemini-1.5-flash">Gemini 1.5 Flash (Default)</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
              <option value="gpt-4o-mini">GPT-4o Mini</option>
              <option value="gpt-4o">GPT-4o</option>
            </select>
          </div>

          <button 
            onClick={runSimulation}
            disabled={loading}
            className="btn-primary py-2 px-4 rounded-lg text-xs"
          >
            {loading ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin" />
                Simulating...
              </>
            ) : (
              <>
                <Cpu className="h-3.5 w-3.5" />
                Initialize Loop
              </>
            )}
          </button>
        </div>
      </header>

      {/* 2. Interactive Time-Machine Playback Hub */}
      <section className="mx-8 mt-6 aegis-card py-4 px-6 flex items-center justify-between border-indigo-500/20 bg-slate-900/40">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="h-11 w-11 rounded-full bg-indigo-600/90 text-white flex items-center justify-center hover:bg-indigo-500 hover:scale-105 active:scale-95 transition-all shadow-md shadow-indigo-600/20"
          >
            {isPlaying ? <Pause className="h-5 w-5 fill-white" /> : <Play className="h-5 w-5 fill-white ml-0.5" />}
          </button>
          
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Simulation Ticker</span>
              <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 rounded-full animate-pulse">
                Day {activeDay} | Tick {activeSession}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Timeline playback tracks portfolio logs and historical spreads.</p>
          </div>
        </div>

        {/* Timeline Slider */}
        <div className="flex-1 max-w-xl mx-8 flex items-center gap-4">
          <span className="text-xs font-mono text-slate-400">Start</span>
          <input 
            type="range"
            min={0}
            max={simulationData.stocks.length - 1}
            value={playIndex}
            onChange={(e) => {
              setIsPlaying(false);
              setPlayIndex(Number(e.target.value));
            }}
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
          <span className="text-xs font-mono text-slate-400">End</span>
        </div>

        <button 
          onClick={() => { setIsPlaying(false); setPlayIndex(0); }}
          className="btn-secondary py-2 px-3 text-xs flex items-center gap-1.5"
        >
          <RefreshCw className="h-3 w-3" />
          Reset Track
        </button>
      </section>

      {/* 3. Hero KPI Performance Cards */}
      <section className="dashboard-grid py-4 pt-6">
        
        {/* Card 1: Securities Pricing */}
        <div className="col-span-3 aegis-card flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase">Active Stock Prices</p>
            <div className="mt-2 flex items-baseline gap-4">
              <div>
                <span className="text-2xl font-bold text-slate-100">${currentSnapshot.price_a}</span>
                <span className="text-[10px] text-slate-400 ml-1">Ticker A</span>
              </div>
              <div className="h-6 w-px bg-slate-800" />
              <div>
                <span className="text-2xl font-bold text-indigo-400">${currentSnapshot.price_b}</span>
                <span className="text-[10px] text-slate-400 ml-1">Ticker B</span>
              </div>
            </div>
          </div>
          <div className="h-10 w-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        {/* Card 2: Liquidity Buffer */}
        <div className="col-span-3 aegis-card flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase">Active Debt Leverage</p>
            <h3 className="text-2xl font-bold text-amber-400 mt-2">${totalLeverageIssued.toLocaleString()}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Total credit advanced to simulated agents</p>
          </div>
          <div className="h-10 w-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-400">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        {/* Card 3: Market Friction */}
        <div className="col-span-3 aegis-card flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase">Market Friction Index</p>
            <h3 className="text-2xl font-bold text-emerald-400 mt-2">{marketVolatilityIndex}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Absolute dynamic price spread from baseline</p>
          </div>
          <div className="h-10 w-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
            <Zap className="h-5 w-5" />
          </div>
        </div>

        {/* Card 4: Total Trades matched */}
        <div className="col-span-3 aegis-card flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase">Order Executions</p>
            <h3 className="text-2xl font-bold text-cyan-400 mt-2">{activeTrades.length} Trades</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Accumulated fills on double auction matching</p>
          </div>
          <div className="h-10 w-10 bg-cyan-500/10 rounded-xl flex items-center justify-center text-cyan-400">
            <Users className="h-5 w-5" />
          </div>
        </div>

      </section>

      {/* 4. Core Visual Analytics Panels */}
      <section className="dashboard-grid py-2">
        
        {/* Panel 1: Security Pricing Line Graphs */}
        <div className="col-span-8 aegis-card flex flex-col justify-between h-[400px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Continuous Session Asset Pricing</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Voxel random walk based on bid-ask limits execution</p>
            </div>
            <div className="flex gap-2">
              <span className="text-[10px] font-semibold border border-slate-700 bg-slate-800 px-2 py-0.5 rounded text-slate-300">Ticker A (Industrial)</span>
              <span className="text-[10px] font-semibold border border-indigo-900 bg-indigo-950 px-2 py-0.5 rounded text-indigo-400">Ticker B (Tech)</span>
            </div>
          </div>
          
          <div className="flex-1 w-full text-xs">
            <ResponsiveContainer width="100%" height="95%">
              <LineChart data={activeStockPrices}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="tick" stroke="var(--text-muted)" fontSize={9} />
                <YAxis stroke="var(--text-muted)" fontSize={9} domain={['auto', 'auto']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1E293B', borderColor: 'var(--border-color)', color: '#fff' }}
                  labelStyle={{ fontSize: 10, fontWeight: 'bold' }}
                />
                <Line type="monotone" dataKey="StockA" stroke="#38bdf8" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="StockB" stroke="#6366f1" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Panel 2: Live Forum Updates feed */}
        <div className="col-span-4 aegis-card flex flex-col justify-between h-[400px] overflow-hidden">
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-indigo-400" />
                Community Forum Stream
              </h3>
              <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-300 font-semibold px-2 py-0.5 rounded-full">Day {activeDay}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Sentiment postings broadcasted by traders daily</p>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-3">
            {activeForumPosts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500">
                <Cpu className="h-8 w-8 mb-2 animate-pulse" />
                <p className="text-xs">No posts generated for Day {activeDay}.</p>
              </div>
            ) : (
              activeForumPosts.map((post, idx) => {
                const colors = {
                  "Conservative": "border-cyan-500/20 bg-cyan-950/10 text-cyan-400",
                  "Aggressive": "border-orange-500/20 bg-orange-950/10 text-orange-400",
                  "Balanced": "border-blue-500/20 bg-blue-950/10 text-blue-400",
                  "Growth-Oriented": "border-emerald-500/20 bg-emerald-950/10 text-emerald-400",
                  "Macroeconomics": "border-rose-500/25 bg-rose-950/15 text-rose-400 font-semibold"
                };
                return (
                  <div key={idx} className={`p-3 rounded-xl border ${colors[post.persona] || 'border-slate-800 bg-slate-900/40 text-slate-300'}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        {post.persona === "Macroeconomics" ? "🚨 POLICY ANNOUNCEMENT" : `Trader ${post.agent_id} (${post.persona})`}
                      </span>
                      <span className="text-[9px] text-slate-500">Day {post.day}</span>
                    </div>
                    <p className="text-xs leading-relaxed">{post.message}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </section>

      {/* 5. Balances sheets, Scenario Injector, & Tape logs */}
      <section className="dashboard-grid py-2">
        
        {/* Sub-Panel 1: Agent Wealth distributions */}
        <div className="col-span-8 aegis-card flex flex-col justify-between h-[350px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Agent Balance Sheet Asset Distribution</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Aggregate portfolio wealth compared to credit liabilities</p>
            </div>
          </div>
          
          <div className="flex-1 w-full text-xs">
            <ResponsiveContainer width="100%" height="95%">
              <BarChart data={agentWealthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={9} />
                <YAxis stroke="var(--text-muted)" fontSize={9} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1E293B', borderColor: 'var(--border-color)', color: '#fff' }}
                />
                <Legend fontSize={10} />
                <Bar dataKey="Wealth" fill="#818cf8" radius={[4, 4, 0, 0]} name="Total Portfolio Capital" />
                <Bar dataKey="Cash" fill="#34d399" radius={[4, 4, 0, 0]} name="Liquid Cash Reserve" />
                <Bar dataKey="Debt" fill="#fb7185" radius={[4, 4, 0, 0]} name="Liabilities/Debt" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sub-Panel 2: Macroeconomic Scenario Shock Injector */}
        <div className="col-span-4 aegis-card flex flex-col justify-between h-[350px]">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              Macroeconomic Shock Injector
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Inject structural disruptions into the live system</p>
          </div>

          <div className="flex-1 flex flex-col justify-center space-y-3">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400">Scenario Title</label>
              <input 
                type="text"
                value={shockTitle}
                onChange={(e) => setShockTitle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs mt-1 text-slate-200 outline-none focus:border-indigo-500 transition-colors"
                placeholder="Interest Rate Shock"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400">Disclosure Statement</label>
              <textarea 
                rows={2}
                value={shockMessage}
                onChange={(e) => setShockMessage(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs mt-1 text-slate-200 outline-none resize-none focus:border-indigo-500 transition-colors"
                placeholder="Inject policy rates cuts or corporate audits"
              />
            </div>
            
            <button 
              onClick={injectShock}
              className="btn-primary w-full py-2.5 rounded-lg justify-center text-xs flex items-center gap-1.5"
            >
              <Zap className="h-3.5 w-3.5" />
              Trigger Event Shock
            </button>

            {shockSuccess && (
              <span className="text-[10px] text-center text-emerald-400 bg-emerald-950/20 border border-emerald-500/20 rounded py-1 px-2 font-semibold">
                Event injected into local queue!
              </span>
            )}
          </div>
        </div>

      </section>

      {/* 6. Continuous Transaction logs table */}
      <section className="mx-8 mt-6 aegis-card">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Matching Engine Trade Tape Ledger</h3>
            <p className="text-xs text-slate-400 mt-0.5">Historically recorded orders matched on the exchange</p>
          </div>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-3 py-1 border border-slate-800 rounded">
            Total Matches: {activeTrades.length}
          </span>
        </div>

        <div className="max-h-[200px] overflow-y-auto text-xs">
          {activeTrades.length === 0 ? (
            <p className="text-center text-slate-500 py-6">No trades executed on current segment.</p>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                  <th className="py-2.5">Tick</th>
                  <th className="py-2.5">Security</th>
                  <th className="py-2.5">Buyer</th>
                  <th className="py-2.5">Seller</th>
                  <th className="py-2.5">Quantity</th>
                  <th className="py-2.5">Limit Price</th>
                  <th className="py-2.5 text-right">Total Consideration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-slate-300">
                {activeTrades.slice(-20).reverse().map((t, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/30">
                    <td className="py-2">Day {t.day} | Sess {t.session}</td>
                    <td className="py-2">
                      <span className={`font-semibold px-2 py-0.5 rounded text-[10px] ${t.ticker === "A" ? 'bg-sky-500/10 text-sky-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                        Stock {t.ticker}
                      </span>
                    </td>
                    <td className="py-2">Trader {t.buyer}</td>
                    <td className="py-2">Trader {t.seller}</td>
                    <td className="py-2 font-mono">{t.amount} shares</td>
                    <td className="py-2 font-mono">${t.price}</td>
                    <td className="py-2 font-mono text-right text-emerald-400">${round(t.amount * t.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

    </div>
  );
}
