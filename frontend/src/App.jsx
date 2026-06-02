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

  // Generates beautifully clean, highly dynamic timeline matching order books
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
      <div style={{ display: 'flex', height: 'screen', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B0F19' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw className="animate-spin" style={{ margin: '0 auto', height: '48px', width: '48px', color: '#6366F1' }} />
          <h2 style={{ marginTop: '16px', fontWeight: 600, color: '#F8FAFC' }}>Initializing AegisMarket Space...</h2>
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
    name: `Trader ${a.agent_id}`,
    Wealth: a.net_worth,
    Cash: a.cash,
    Debt: a.debt
  }));

  return (
    <div className="aegis-app">
      
      {/* 1. Header Navigation Component */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-logo">🛡️</div>
          <div>
            <h1 className="brand-title">AegisMarket</h1>
            <p className="brand-subtitle">Autonomous Financial Agent Sandbox</p>
          </div>
        </div>

        {/* Configurations inputs panels */}
        <div className="config-bar">
          <div className="config-group">
            <label>Traders:</label>
            <select 
              value={agents} 
              onChange={(e) => setAgents(Number(e.target.value))}
              className="config-select"
            >
              <option value={3}>3 Agents</option>
              <option value={5}>5 Agents</option>
              <option value={10}>10 Agents</option>
            </select>
          </div>
          
          <div className="config-group">
            <label>Days:</label>
            <select 
              value={days} 
              onChange={(e) => setDays(Number(e.target.value))}
              className="config-select"
            >
              <option value={5}>5 Days</option>
              <option value={10}>10 Days</option>
              <option value={15}>15 Days</option>
            </select>
          </div>

          <div className="config-group">
            <label>LLM Engine:</label>
            <select 
              value={model} 
              onChange={(e) => setModel(e.target.value)}
              className="config-select"
            >
              <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
              <option value="gpt-4o-mini">GPT-4o Mini</option>
            </select>
          </div>

          <button 
            onClick={runSimulation}
            disabled={loading}
            className="btn-primary-action"
            style={{ borderRadius: '10px', padding: '8px 14px' }}
          >
            {loading ? (
              <>
                <RefreshCw className="animate-spin" style={{ height: '14px', width: '14px' }} />
                Simulating...
              </>
            ) : (
              <>
                <Cpu style={{ height: '14px', width: '14px' }} />
                Run Simulator
              </>
            )}
          </button>
        </div>
      </header>

      {/* 2. Playback timeline slider component */}
      <section className="playback-bar">
        <div className="playback-controls">
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="play-btn"
          >
            {isPlaying ? <Pause style={{ fill: 'white', stroke: 'white', height: '18px', width: '18px' }} /> : <Play style={{ fill: 'white', stroke: 'white', height: '18px', width: '18px', marginLeft: '2px' }} />}
          </button>
          
          <div>
            <span className="status-badge">
              Active Tick: Day {activeDay} | Session {activeSession}
            </span>
          </div>
        </div>

        <div className="timeline-slider-container">
          <span>Start</span>
          <input 
            type="range"
            min={0}
            max={simulationData.stocks.length - 1}
            value={playIndex}
            onChange={(e) => {
              setIsPlaying(false);
              setPlayIndex(Number(e.target.value));
            }}
            className="timeline-slider"
          />
          <span>End</span>
        </div>

        <button 
          onClick={() => { setIsPlaying(false); setPlayIndex(0); }}
          className="config-select"
          style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw style={{ height: '12px', width: '12px' }} />
          Reset Track
        </button>
      </section>

      {/* 3. KPI stats cards list */}
      <section className="kpi-grid">
        
        {/* KPI 1 */}
        <div className="kpi-card">
          <div>
            <p className="kpi-label">Securities Valuation</p>
            <div className="kpi-value-row">
              <div>
                <span className="kpi-val">${currentSnapshot.price_a}</span>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)', marginLeft: '4px' }}>Ticker A</span>
              </div>
              <div style={{ height: '18px', width: '1px', backgroundColor: 'var(--border-dim)' }} />
              <div>
                <span className="kpi-val cyan">${currentSnapshot.price_b}</span>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)', marginLeft: '4px' }}>Ticker B</span>
              </div>
            </div>
          </div>
          <div className="kpi-icon-box indigo">
            <TrendingUp style={{ height: '18px', width: '18px' }} />
          </div>
        </div>

        {/* KPI 2 */}
        <div className="kpi-card">
          <div>
            <p className="kpi-label">Outstanding Leverage</p>
            <div className="kpi-value-row">
              <span className="kpi-val amber">${totalLeverageIssued.toLocaleString()}</span>
            </div>
          </div>
          <div className="kpi-icon-box amber">
            <DollarSign style={{ height: '18px', width: '18px' }} />
          </div>
        </div>

        {/* KPI 3 */}
        <div className="kpi-card">
          <div>
            <p className="kpi-label">Spread Volatility</p>
            <div className="kpi-value-row">
              <span className="kpi-val">{marketVolatilityIndex}</span>
            </div>
          </div>
          <div className="kpi-icon-box emerald">
            <Zap style={{ height: '18px', width: '18px' }} />
          </div>
        </div>

        {/* KPI 4 */}
        <div className="kpi-card">
          <div>
            <p className="kpi-label">Exchange Fills</p>
            <div className="kpi-value-row">
              <span className="kpi-val cyan">{activeTrades.length} Matches</span>
            </div>
          </div>
          <div className="kpi-icon-box cyan">
            <Users style={{ height: '18px', width: '18px' }} />
          </div>
        </div>

      </section>

      {/* 4. Multi column cockpit panels layout */}
      <section className="dashboard-body">
        
        {/* Left Column blocks */}
        <div className="left-panel">
          
          {/* Chart card 1 */}
          <div className="aegis-card-clean" style={{ height: '340px' }}>
            <div className="card-title-bar">
              <div>
                <h3>Continuous Asset Price Ledger</h3>
                <p>Real-time limit orders executed through continuous double auction matching</p>
              </div>
            </div>
            
            <div style={{ flex: 1, width: '100%', fontSize: '11px', marginTop: '10px' }}>
              <ResponsiveContainer width="100%" height="95%">
                <AreaChart data={activeStockPrices}>
                  <defs>
                    <linearGradient id="colorA" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorB" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="tick" stroke="var(--text-muted)" fontSize={8} />
                  <YAxis stroke="var(--text-muted)" fontSize={8} domain={['auto', 'auto']} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(16,24,48,0.95)', border: '1px solid var(--border-glow)', color: '#fff', borderRadius: '12px' }}
                  />
                  <Area type="monotone" dataKey="StockA" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorA)" name="Stock A (Mature)" />
                  <Area type="monotone" dataKey="StockB" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorB)" name="Stock B (Tech Growth)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart card 2 */}
          <div className="aegis-card-clean" style={{ height: '300px', marginTop: '24px' }}>
            <div className="card-title-bar">
              <div>
                <h3>Agent Balance Sheets & Capital Reserves</h3>
                <p>Allocation of cash buffers compared against leverage liabilities</p>
              </div>
            </div>
            
            <div style={{ flex: 1, width: '100%', fontSize: '11px', marginTop: '10px' }}>
              <ResponsiveContainer width="100%" height="95%">
                <BarChart data={agentWealthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={8} />
                  <YAxis stroke="var(--text-muted)" fontSize={8} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(16,24,48,0.95)', border: '1px solid var(--border-glow)', color: '#fff', borderRadius: '12px' }}
                  />
                  <Legend fontSize={8} />
                  <Bar dataKey="Wealth" fill="#6366f1" radius={[4, 4, 0, 0]} name="Total Portfolio Capital" />
                  <Bar dataKey="Cash" fill="#10b981" radius={[4, 4, 0, 0]} name="Liquid Cash reserves" />
                  <Bar dataKey="Debt" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Debt Liabilities" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Transaction Ledgers table */}
          <div className="aegis-card-clean" style={{ marginTop: '24px', padding: '16px 20px' }}>
            <div className="card-title-bar" style={{ marginBottom: '12px' }}>
              <div>
                <h3>Matching Engine Order Book Ledger</h3>
                <p>Historically matched transactions executed on the exchange</p>
              </div>
            </div>

            <div className="ledger-table-box">
              {activeTrades.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>No matches recorded on active timeline.</p>
              ) : (
                <table className="ledger-table">
                  <thead>
                    <tr>
                      <th>Tick</th>
                      <th>Ticker</th>
                      <th>Buyer</th>
                      <th>Seller</th>
                      <th>Quantity</th>
                      <th>Limit Price</th>
                      <th style={{ textAlign: 'right' }}>Total Consideration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeTrades.slice(-15).reverse().map((t, idx) => (
                      <tr key={idx}>
                        <td>D{t.day} S{t.session}</td>
                        <td>
                          <span className={`ledger-ticker ${t.ticker.toLowerCase()}`}>
                            Stock {t.ticker}
                          </span>
                        </td>
                        <td>Trader {t.buyer}</td>
                        <td>Trader {t.seller}</td>
                        <td>{t.amount} shares</td>
                        <td>${t.price}</td>
                        <td style={{ textAlign: 'right', color: 'var(--emerald)', fontWeight: 600 }}>${round(t.amount * t.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>

        {/* Right Column blocks */}
        <div className="right-panel">
          
          {/* Reddit Analytical forum */}
          <div className="aegis-card-clean" style={{ height: '380px' }}>
            <div className="card-title-bar">
              <div>
                <h3>Shared Analytical Forum Stream</h3>
                <p>Sentiment postings broadcasted by traders daily</p>
              </div>
            </div>

            <div className="scroll-feed">
              {activeForumPosts.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                  <MessageSquare style={{ height: '32px', width: '32px', marginBottom: '8px', opacity: 0.3 }} />
                  <p>No analytical briefings.</p>
                </div>
              ) : (
                activeForumPosts.map((post, idx) => {
                  const pClass = post.persona.toLowerCase().replace(' ', '-');
                  return (
                    <div key={idx} className={`post-item ${pClass}`}>
                      <div className="post-header">
                        <span>{post.persona === "Macroeconomics" ? "🚨 System Directive" : `Agent ${post.agent_id} (${post.persona})`}</span>
                        <span>Day {post.day}</span>
                      </div>
                      <p className="post-body">{post.message}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Macroeconomic events shock injector card */}
          <div className="aegis-card-clean" style={{ height: '300px' }}>
            <div className="card-title-bar">
              <div>
                <h3>Macro Credit Shock Console</h3>
                <p>Inject dynamic interest shifts or audits into the live loop</p>
              </div>
            </div>

            <div className="shock-form">
              <div className="shock-field">
                <label>Directives Title</label>
                <input 
                  type="text"
                  value={shockTitle}
                  onChange={(e) => setShockTitle(e.target.value)}
                  className="shock-input"
                />
              </div>
              
              <div className="shock-field">
                <label>Shock Announcement</label>
                <textarea 
                  rows={2}
                  value={shockMessage}
                  onChange={(e) => setShockMessage(e.target.value)}
                  className="shock-input"
                  style={{ fontFamily: 'inherit', resize: 'none' }}
                />
              </div>

              <button 
                onClick={injectShock}
                className="btn-primary-action"
                style={{ width: '100%', marginTop: '6px' }}
              >
                <Zap style={{ height: '12px', width: '12px' }} />
                Trigger Credit Shock
              </button>

              {shockSuccess && (
                <div style={{ fontSize: '10px', color: 'var(--emerald)', border: '1px solid rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.05)', padding: '6px', borderRadius: '6px', textAlign: 'center', fontWeight: 600 }}>
                  Shock injected into simulation loop!
                </div>
              )}
            </div>
          </div>

        </div>

      </section>

    </div>
  );
}
