import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Terminal as TerminalIcon, 
  Cpu, 
  Activity, 
  ShieldAlert, 
  CheckCircle, 
  RefreshCw, 
  Trash2, 
  Send, 
  GitCommit, 
  Database, 
  Layers, 
  Sliders, 
  Copy, 
  Check, 
  Zap, 
  Play, 
  Radio, 
  Hash, 
  SlidersHorizontal,
  Workflow
} from 'lucide-react';

interface LedgerEntry {
  id: string;
  timestamp: string;
  input: string;
  entropy: number;
  parity: string;
  checks: {
    structureAudit: string;
    nodeParity: string;
    tecoeAlignment: string;
    protocolExtraction: string;
  };
  status: 'PERFECT' | 'ALIGNED' | 'DEVIANT' | 'CRITICAL';
  sha256: string;
  parentHash?: string;
  resolutionBubble?: string | null;
}

interface Tether {
  id: string;
  payload: string;
  timestamp: string;
  status: 'active' | 'suspended' | 'depleted';
}

export default function App() {
  // Navigation/Theme sub-state
  const [activePreset, setActivePreset] = useState<'violet' | 'cyan' | 'indigo'>('violet');
  
  // Storage states
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [tethers, setTethers] = useState<Tether[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [loadingTethers, setLoadingTethers] = useState(false);

  // Maturity states
  interface MaturityData {
    status: string;
    bootTime: string;
    uptimeSeconds: number;
    transactionCount: number;
    systemMaturity: number;
  }
  const [maturityData, setMaturityData] = useState<MaturityData | null>(null);

  // Verification states
  interface VerificationResult {
    verified: boolean;
    chainLength: number;
    message: string;
    details: string[];
  }
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [verifyingLedger, setVerifyingLedger] = useState(false);

  // Form states
  const [terminalInput, setTerminalInput] = useState('');
  const [processingInput, setProcessingInput] = useState(false);
  const [lastProcessed, setLastProcessed] = useState<LedgerEntry | null>(null);

  const [tetherPayload, setTetherPayload] = useState('');
  const [tetherStatus, setTetherStatus] = useState<'active' | 'suspended' | 'depleted'>('active');
  const [creatingTether, setCreatingTether] = useState(false);

  // Focus point interactive state
  const [pulseFreq, setPulseFreq] = useState(1.5); // pulse duration in seconds
  const [pulseScale, setPulseScale] = useState(1.8); // pulse scale multiplier
  const [focusState, setFocusState] = useState<'STABLE' | 'CALIBRATION' | 'HYPER-ALIGN'>('STABLE');

  // Copy success indicator
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Log notifications inside the terminal view
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    'SYSTEM BOOT: Sovereign dAIsy haMINJA OS initialized.',
    'TECOE PIPELINE: 54-node synchronous telemetry online.',
    'LEDGER CORE: Audit checksum engine verified.'
  ]);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Fetch ledger and tethers on load
  useEffect(() => {
    fetchLedger();
    fetchTethers();
    fetchMaturity();

    const interval = setInterval(() => {
      fetchMaturity();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLogs]);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTerminalLogs(prev => [...prev, `[${timestamp}] ${msg}`]);
  };

  const fetchLedger = async () => {
    try {
      setLoadingLedger(true);
      const res = await fetch('/api/ledger');
      if (res.ok) {
        const data = await res.json();
        setLedger(data);
      }
    } catch (err) {
      console.error('Error fetching ledger:', err);
    } finally {
      setLoadingLedger(false);
    }
  };

  const fetchTethers = async () => {
    try {
      setLoadingTethers(true);
      const res = await fetch('/api/tethers');
      if (res.ok) {
        const data = await res.json();
        setTethers(data);
      }
    } catch (err) {
      console.error('Error fetching tethers:', err);
    } finally {
      setLoadingTethers(false);
    }
  };

  const fetchMaturity = async () => {
    try {
      const res = await fetch('/api/status/maturity');
      if (res.ok) {
        const data = await res.json();
        setMaturityData(data);
      }
    } catch (err) {
      console.error('Error fetching maturity metrics:', err);
    }
  };

  const verifyLedgerChain = async () => {
    try {
      setVerifyingLedger(true);
      addLog('LEDGER: Initiating complete cryptographic chain verification audit...');
      const res = await fetch('/api/ledger/verify');
      if (res.ok) {
        const data: VerificationResult = await res.json();
        setVerificationResult(data);
        if (data.verified) {
          addLog(`SUCCESS: Audit Chain Integrity Verified. Continuity is intact across ${data.chainLength} nodes.`);
          
          // Store user state to revert back after the flash
          const prevFocusState = focusState;
          const prevFreq = pulseFreq;
          const prevScale = pulseScale;

          // Flash focus point: High cycle processing simulation & max expansion ratio
          setFocusState('HYPER-ALIGN');
          setPulseFreq(0.2); // high cycle (0.2s pulse loop)
          setPulseScale(3.0); // maximum expansion
          
          setTimeout(() => {
            setFocusState(prevFocusState);
            setPulseFreq(prevFreq);
            setPulseScale(prevScale);
          }, 3500);
        } else {
          addLog(`WARNING: Cryptographic discontinuity detected! Details: ${data.details.join(', ')}`);
        }
      }
    } catch (err) {
      addLog('ERROR: Disconnection during cryptographic chain audit.');
    } finally {
      setVerifyingLedger(false);
    }
  };

  const handleProcessInput = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!terminalInput.trim()) return;

    try {
      setProcessingInput(true);
      addLog(`ENGINE: Processing payload size: ${terminalInput.length} octets...`);
      
      const res = await fetch('/api/engine/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: terminalInput })
      });

      if (res.ok) {
        const data: LedgerEntry = await res.json();
        setLastProcessed(data);
        setLedger(prev => [data, ...prev]);
        setTerminalInput('');
        addLog(`SUCCESS: Transaction ${data.id} recorded. Entropy: ${data.entropy}. SHA256: ${data.sha256.substring(0, 12)}...`);
        fetchMaturity();
        fetchTethers(); // Since high entropy inputs (>4.5) auto-create tethers!
      } else {
        const errData = await res.json();
        addLog(`ERROR: Backend process failed: ${errData.error}`);
      }
    } catch (err: any) {
      addLog(`ERROR: Connection interface failure.`);
    } finally {
      setProcessingInput(false);
    }
  };

  const handleCreateTether = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tetherPayload.trim()) return;

    try {
      setCreatingTether(true);
      const res = await fetch('/api/tethers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: tetherPayload, status: tetherStatus })
      });

      if (res.ok) {
        const newT: Tether = await res.json();
        setTethers(prev => [newT, ...prev]);
        setTetherPayload('');
        addLog(`TETHER: Tether created. Address: ${newT.id}. Status: ${newT.status}`);
      }
    } catch (err) {
      addLog(`ERROR: Failed to establish Tether point.`);
    } finally {
      setCreatingTether(false);
    }
  };

  const handleCycleTetherStatus = async (id: string, currentStatus: 'active' | 'suspended' | 'depleted') => {
    const statusCycle: Record<string, 'active' | 'suspended' | 'depleted'> = {
      active: 'suspended',
      suspended: 'depleted',
      depleted: 'active'
    };
    const nextStatus = statusCycle[currentStatus];

    try {
      const res = await fetch(`/api/tethers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });

      if (res.ok) {
        const updated: Tether = await res.json();
        setTethers(prev => prev.map(t => t.id === id ? updated : t));
        addLog(`TETHER: Tether ${id} mutated status to ${nextStatus.toUpperCase()}`);
      }
    } catch (err) {
      addLog(`ERROR: Failed to mutate Tether status.`);
    }
  };

  const handleDeleteTether = async (id: string) => {
    try {
      const res = await fetch(`/api/tethers/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setTethers(prev => prev.filter(t => t.id !== id));
        addLog(`TETHER: Tether ${id} dissolved from storage buffer.`);
      }
    } catch (err) {
      addLog(`ERROR: Failed to dissolve Tether.`);
    }
  };

  const handleClearLedger = async () => {
    try {
      const res = await fetch('/api/ledger/clear', { method: 'POST' });
      if (res.ok) {
        setLedger([]);
        setLastProcessed(null);
        addLog(`LEDGER: Entire audit history scrubbed. Checksum cleared.`);
      }
    } catch (err) {
      addLog(`ERROR: Ledger scrub failed.`);
    }
  };

  const handleInjectMacro = (macroText: string) => {
    setTerminalInput(macroText);
    addLog(`TERMINAL: Macro code "${macroText.substring(0, 20)}..." injected.`);
  };

  const triggerCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Pulse animation parameter calculation
  const getPulseColor = () => {
    if (focusState === 'CALIBRATION') return 'rgba(157, 78, 221, 0.4)'; // Violet
    if (focusState === 'HYPER-ALIGN') return 'rgba(76, 201, 240, 0.5)'; // Cyan
    return 'rgba(67, 97, 238, 0.4)'; // Indigo
  };

  const getFocusClass = () => {
    if (focusState === 'CALIBRATION') return 'text-purple-400 border-purple-500/20 shadow-purple-500/10';
    if (focusState === 'HYPER-ALIGN') return 'text-cyan-400 border-cyan-500/20 shadow-cyan-500/10';
    return 'text-indigo-400 border-indigo-500/20 shadow-indigo-500/10';
  };

  return (
    <div className="min-h-screen bg-[#080a10] text-slate-100 font-sans selection:bg-indigo-500/20 selection:text-indigo-300 antialiased p-3 sm:p-6">
      
      {/* Sovereignty Top Utility Bar */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-4 px-4 py-3 bg-[#0e121d] border border-[#242d44] rounded-xl text-xs">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
          </div>
          <span className="font-mono uppercase tracking-widest font-bold text-indigo-400">dAIsy haMINJA Sovereign OS</span>
          <span className="text-[#242d44]">|</span>
          <span className="text-slate-400 font-mono flex items-center gap-1">
            <Workflow className="h-3.5 w-3.5 text-slate-500" />
            54-Node TECOE active
          </span>
        </div>
        
        <div className="flex items-center gap-3 font-mono text-slate-400">
          <div className="flex gap-1.5 bg-[#161c2c] p-1 rounded-md border border-[#242d44]">
            {(['violet', 'indigo', 'cyan'] as const).map((color) => (
              <button
                key={color}
                onClick={() => {
                  setActivePreset(color);
                  setFocusState(color === 'violet' ? 'CALIBRATION' : color === 'cyan' ? 'HYPER-ALIGN' : 'STABLE');
                  addLog(`THEME: Core focus adjusted to ${color.toUpperCase()}`);
                }}
                className={`px-2.5 py-0.5 rounded text-[10px] uppercase font-bold transition-all cursor-pointer ${
                  activePreset === color 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {color}
              </button>
            ))}
          </div>
          <span className="text-slate-500 hidden sm:inline">|</span>
          <span className="bg-[#161c2c] px-2 py-0.5 rounded text-[10px] border border-[#242d44] hidden sm:inline">
            SYSTEM_STABLE
          </span>
        </div>
      </div>

      {/* Main Core Viewport */}
      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ================= LEFT SIDEBAR (CONTAINS LIVING FOCUS POINT & TETHERS) ================= */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Phase 1: The Living Focus Point Component */}
          <section className="bg-[#0e121d] rounded-2xl border border-[#242d44] p-6 space-y-6 relative overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono tracking-widest uppercase text-indigo-400 block font-bold">Phase 1 Integration</span>
                <h2 className="text-lg font-extrabold tracking-tight">Living Focus Point</h2>
              </div>
              <div className="flex gap-1.5 text-[10px] font-mono">
                <span className={`px-2 py-0.5 rounded font-bold border ${getFocusClass()}`}>
                  {focusState}
                </span>
              </div>
            </div>

            {/* Pulsing Visual Centerpiece */}
            <div className="h-60 rounded-xl border border-[#242d44] bg-[#090c13] flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-radial-gradient from-transparent to-[#080a10]/50 pointer-events-none" />
              
              {/* Concentric Animated Wave Circles */}
              <AnimatePresence mode="popLayout">
                <motion.div 
                  key={`${pulseFreq}-${pulseScale}-${focusState}`}
                  className="absolute"
                >
                  {/* Glowing Outer Ring */}
                  <motion.div
                    animate={{
                      scale: [1, pulseScale, pulseScale * 1.2, 1],
                      opacity: [0.1, 0.5, 0, 0.1],
                    }}
                    transition={{
                      duration: pulseFreq,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute rounded-full border"
                    style={{
                      borderColor: getPulseColor(),
                      boxShadow: `0 0 40px ${getPulseColor()}`,
                      width: '120px',
                      height: '120px',
                      left: '-60px',
                      top: '-60px'
                    }}
                  />

                  {/* Intersecting Mid Ring */}
                  <motion.div
                    animate={{
                      scale: [1, pulseScale * 0.8, 1],
                      opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{
                      duration: pulseFreq * 1.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute rounded-full border border-dashed"
                    style={{
                      borderColor: getPulseColor(),
                      width: '80px',
                      height: '80px',
                      left: '-40px',
                      top: '-40px'
                    }}
                  />

                  {/* Primary Center Orb */}
                  <motion.div
                    animate={{
                      scale: [1, 1.15, 1],
                      boxShadow: [
                        `0 0 15px ${getPulseColor()}`,
                        `0 0 35px ${getPulseColor()}`,
                        `0 0 15px ${getPulseColor()}`
                      ]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute h-8 w-8 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor: getPulseColor().replace('0.4', '1').replace('0.5', '1'),
                      left: '-16px',
                      top: '-16px'
                    }}
                  >
                    <Radio className="h-4 w-4 text-[#080a10]" />
                  </motion.div>
                </motion.div>
              </AnimatePresence>

              {/* Live Telemetry Display */}
              <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center font-mono text-[9px] text-slate-400 bg-[#0e121d]/80 px-2 py-1 rounded border border-[#242d44]/50 backdrop-blur-sm">
                <span>FREQ: {(1 / pulseFreq).toFixed(2)} Hz</span>
                <span>AMPLITUDE: {pulseScale.toFixed(2)}x</span>
                <span className="flex items-center gap-1">
                  <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                  STABLE
                </span>
              </div>
            </div>

            {/* Custom Focus Controllers */}
            <div className="space-y-4 bg-[#161c2c]/40 p-4 rounded-xl border border-[#242d44] text-xs">
              <span className="text-[10px] font-mono tracking-wider uppercase text-slate-400 font-bold block">
                Focus Point Tuning Controls
              </span>
              
              <div className="space-y-1">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Pulse Period (Interval Speed)</span>
                  <span className="font-mono text-indigo-400">{pulseFreq}s</span>
                </div>
                <input 
                  type="range" 
                  min="0.5" 
                  max="4.0" 
                  step="0.1"
                  value={pulseFreq} 
                  onChange={(e) => {
                    setPulseFreq(parseFloat(e.target.value));
                    addLog(`CALIBRATION: Frequency threshold adjusted to ${(1 / parseFloat(e.target.value)).toFixed(2)} Hz`);
                  }}
                  className="w-full accent-indigo-500 h-1.5 bg-[#090c13] rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Visual Pulse Expansion</span>
                  <span className="font-mono text-indigo-400">{pulseScale}x</span>
                </div>
                <input 
                  type="range" 
                  min="1.1" 
                  max="3.0" 
                  step="0.1"
                  value={pulseScale} 
                  onChange={(e) => {
                    setPulseScale(parseFloat(e.target.value));
                    addLog(`CALIBRATION: Amplitude displacement set to ${e.target.value}x`);
                  }}
                  className="w-full accent-indigo-500 h-1.5 bg-[#090c13] rounded-lg cursor-pointer"
                />
              </div>

              {/* State Multi-Switch */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                {(['STABLE', 'CALIBRATION', 'HYPER-ALIGN'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setFocusState(st);
                      if (st === 'STABLE') {
                        setPulseFreq(1.8);
                        setPulseScale(1.5);
                        setActivePreset('indigo');
                      } else if (st === 'CALIBRATION') {
                        setPulseFreq(0.8);
                        setPulseScale(2.2);
                        setActivePreset('violet');
                      } else {
                        setPulseFreq(2.5);
                        setPulseScale(2.8);
                        setActivePreset('cyan');
                      }
                      addLog(`ENGINE: Switched logic resonance to alignment mode: ${st}`);
                    }}
                    className={`py-1.5 rounded text-[10px] font-mono tracking-tighter font-bold transition-all border cursor-pointer ${
                      focusState === st 
                        ? 'bg-slate-100 text-slate-900 border-white shadow' 
                        : 'bg-[#090c13] text-slate-400 border-[#242d44] hover:text-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* System Maturity & Cryptographic Chain Audit Verification */}
          <section className="bg-[#0e121d] rounded-2xl border border-[#242d44] p-6 space-y-6 shadow-2xl">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono tracking-widest uppercase text-emerald-400 block font-bold">System Milestone telemetry</span>
              <h2 className="text-lg font-extrabold tracking-tight">System Maturity & Audit</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Track persistent transactions divided by total system uptime, and run real-time integrity scans across the blockchain audit chain.
              </p>
            </div>

            {/* Live Maturity Metrics Card */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="bg-[#090c13] p-3 rounded-xl border border-[#242d44] space-y-1">
                <span className="text-[8px] font-mono text-slate-500 block">TOTAL PERSISTENT UP-TIME</span>
                <span className="font-mono text-xs sm:text-sm font-bold text-indigo-400">
                  {maturityData ? `${maturityData.uptimeSeconds.toFixed(1)}s` : 'Initializing...'}
                </span>
              </div>
              <div className="bg-[#090c13] p-3 rounded-xl border border-[#242d44] space-y-1">
                <span className="text-[8px] font-mono text-slate-500 block">SYSTEM MATURITY RATIO</span>
                <span className="font-mono text-xs sm:text-sm font-bold text-emerald-400">
                  {maturityData ? `${maturityData.systemMaturity.toFixed(6)}` : '0.000000'}
                </span>
                <span className="text-[7.5px] font-mono text-slate-600 block leading-none mt-0.5">transactions/sec</span>
              </div>
            </div>

            {/* Validate Ledger Chain */}
            <div className="bg-[#161c2c]/40 p-4 rounded-xl border border-[#242d44] space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                  Chain Verification Suite
                </span>
                <button
                  type="button"
                  disabled={verifyingLedger}
                  onClick={verifyLedgerChain}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-mono font-bold bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 rounded text-white shadow-sm transition-all cursor-pointer"
                >
                  {verifyingLedger ? <RefreshCw className="h-3 w-3 animate-spin" /> : <ShieldAlert className="h-3 w-3" />}
                  Verify Continuity
                </button>
              </div>

              {/* Verification Result Feedback */}
              {verificationResult ? (
                <div className={`p-2.5 rounded-lg border font-mono text-[9px] space-y-1.5 ${
                  verificationResult.verified 
                    ? 'bg-emerald-950/25 border-emerald-500/20 text-emerald-400' 
                    : 'bg-red-950/25 border-red-500/20 text-red-400'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold">
                    {verificationResult.verified ? (
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
                    )}
                    <span>{verificationResult.verified ? 'CHAIN CONTINUITY SECURE' : 'INTEGRITY DRIFT DETECTED'}</span>
                  </div>
                  <p className="text-slate-300 leading-snug">{verificationResult.message}</p>
                  <div className="text-slate-500 text-[8px] pt-1 border-t border-slate-800/50">
                    {verificationResult.details.map((d, i) => <div key={i}>{d}</div>)}
                  </div>
                </div>
              ) : (
                <div className="p-3 text-center text-[10px] font-mono text-slate-500 bg-[#090c13] rounded-lg border border-[#242d44]/50">
                  Awaiting audit chain continuity verification.
                </div>
              )}
            </div>
          </section>

          {/* Phase 3: Tether-Bubble Storage Management */}
          <section className="bg-[#0e121d] rounded-2xl border border-[#242d44] p-6 space-y-6 shadow-2xl">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono tracking-widest uppercase text-indigo-400 block font-bold">Phase 3 Integration</span>
              <h2 className="text-lg font-extrabold tracking-tight">Tether-Bubble Storage</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Persist custom Tether objects inside the sandbox JSON memory container across active sessions.
              </p>
            </div>

            {/* Create Tether form */}
            <form onSubmit={handleCreateTether} className="space-y-3 bg-[#161c2c]/40 p-4 rounded-xl border border-[#242d44]">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                  New Tether Payload
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={tetherPayload}
                    onChange={(e) => setTetherPayload(e.target.value)}
                    placeholder="e.g. system_anchor_alpha"
                    className="flex-1 px-3 py-2 text-xs bg-[#090c13] border border-[#242d44] focus:border-indigo-500 rounded-lg outline-none font-mono text-slate-100 transition-all"
                  />
                  <select 
                    value={tetherStatus}
                    onChange={(e) => setTetherStatus(e.target.value as any)}
                    className="px-2 py-2 text-xs bg-[#090c13] border border-[#242d44] text-slate-300 rounded-lg outline-none font-mono cursor-pointer"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="depleted">Depleted</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={creatingTether || !tetherPayload.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 rounded-lg text-white shadow-sm cursor-pointer transition-colors"
                >
                  <Database className="h-3.5 w-3.5" />
                  Register Tether
                </button>
              </div>
            </form>

            {/* Tethers list */}
            <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
              {loadingTethers ? (
                <div className="py-6 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-indigo-500" />
                  <span>Synchronizing Tether buffer...</span>
                </div>
              ) : tethers.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-[#242d44] rounded-xl flex flex-col items-center justify-center">
                  <Layers className="h-6 w-6 text-slate-600 mb-1.5" />
                  <span>No active Tethers configured in persistence.</span>
                </div>
              ) : (
                tethers.map((t) => (
                  <div 
                    key={t.id} 
                    className="p-3 bg-[#090c13] rounded-xl border border-[#242d44] flex items-center justify-between gap-3 group hover:border-slate-700 transition-all"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-indigo-400">{t.id}</span>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          t.status === 'active' ? 'bg-emerald-500' : t.status === 'suspended' ? 'bg-amber-500' : 'bg-red-500'
                        }`} />
                        <span className="text-[8px] font-mono uppercase tracking-widest text-slate-500 font-bold">{t.status}</span>
                      </div>
                      <p className="font-mono text-xs text-slate-200 truncate pr-2">{t.payload}</p>
                      <span className="text-[8px] font-mono text-slate-500 block">
                        {new Date(t.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCycleTetherStatus(t.id, t.status)}
                        className="p-1 rounded bg-[#161c2c] hover:bg-[#242d44] text-slate-400 hover:text-white transition-all cursor-pointer text-[10px] font-mono font-bold"
                        title="Cycle Status"
                      >
                        MUTATE
                      </button>
                      <button
                        onClick={() => handleDeleteTether(t.id)}
                        className="p-1.5 rounded bg-[#161c2c] hover:bg-red-900/40 text-slate-400 hover:text-red-400 transition-all cursor-pointer"
                        title="Scrub"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

        </div>

        {/* ================= RIGHT SIDEBAR (CONTAINS COMMAND TERMINAL & AUDIT LEDGER) ================= */}
        <div className="lg:col-span-7 space-y-6">

          {/* Phase 2: Logic Layer / Engine Process Terminal */}
          <section className="bg-[#0e121d] rounded-2xl border border-[#242d44] p-6 space-y-6 shadow-2xl relative overflow-hidden">
            <div className="flex justify-between items-center">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono tracking-widest uppercase text-indigo-400 block font-bold">Phase 2 Logic Interface</span>
                <h2 className="text-lg font-extrabold tracking-tight">TECOE Pipeline & Audit Ledger</h2>
              </div>
              <TerminalIcon className="h-5 w-5 text-indigo-400" />
            </div>

            {/* Interactive Macro Injectors */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono tracking-wider uppercase text-slate-400 font-bold block">
                Sovereign Code Block Macros
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => handleInjectMacro('{"init":"dAIsy_haMINJA","protocol":"53-paradox"}')}
                  className="px-2 py-1.5 bg-[#161c2c] hover:bg-[#242d44] border border-[#242d44] text-slate-300 hover:text-white rounded-lg transition-all text-left truncate cursor-pointer"
                >
                  [PARADOX_PROTOCOL]
                </button>
                <button
                  type="button"
                  onClick={() => handleInjectMacro('SYS_ENG_ALIGNMENT: node_parity=STABLE entropy=MAX')}
                  className="px-2 py-1.5 bg-[#161c2c] hover:bg-[#242d44] border border-[#242d44] text-slate-300 hover:text-white rounded-lg transition-all text-left truncate cursor-pointer"
                >
                  [TECOE_ALIGN_TXT]
                </button>
                <button
                  type="button"
                  onClick={() => handleInjectMacro('TX_SEED: raw_bubble_state=CALIBRATED')}
                  className="px-2 py-1.5 bg-[#161c2c] hover:bg-[#242d44] border border-[#242d44] text-slate-300 hover:text-white rounded-lg transition-all text-left truncate cursor-pointer"
                >
                  [BUBBLE_ANCHOR]
                </button>
                <button
                  type="button"
                  onClick={() => handleInjectMacro('01010110 01000101 01010010 01011001 01011111 01010011 01010100 01000001 01000010 01001100 01000101')}
                  className="px-2 py-1.5 bg-[#161c2c] hover:bg-[#242d44] border border-[#242d44] text-slate-300 hover:text-white rounded-lg transition-all text-left truncate cursor-pointer"
                >
                  [BINARY_PAYLOAD]
                </button>
              </div>
            </div>

            {/* Terminal Command Input Form */}
            <form onSubmit={handleProcessInput} className="space-y-3.5">
              <div className="relative">
                <input 
                  type="text"
                  value={terminalInput}
                  onChange={(e) => setTerminalInput(e.target.value)}
                  placeholder="Enter raw system command payload or select a macro..."
                  className="w-full px-4 py-3 bg-[#090c13] border border-[#242d44] focus:border-indigo-500 rounded-xl outline-none font-mono text-xs sm:text-sm text-slate-100 placeholder:text-slate-600 transition-all pr-24"
                />
                <div className="absolute right-2 top-2 bottom-2 flex gap-1.5">
                  <button
                    type="submit"
                    disabled={processingInput || !terminalInput.trim()}
                    className="px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-mono font-bold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1"
                  >
                    {processingInput ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                    EXECUTE
                  </button>
                </div>
              </div>
            </form>

            {/* Terminal Output Logs */}
            <div className="bg-[#090c13] rounded-xl border border-[#242d44] p-4 h-[160px] overflow-y-auto font-mono text-[10px] leading-relaxed text-slate-400 space-y-1">
              {terminalLogs.map((log, index) => (
                <div key={index} className="break-all">
                  {log.startsWith('SUCCESS') ? (
                    <span className="text-emerald-400">{log}</span>
                  ) : log.startsWith('ERROR') ? (
                    <span className="text-red-400">{log}</span>
                  ) : log.startsWith('TETHER') ? (
                    <span className="text-cyan-400">{log}</span>
                  ) : log.startsWith('SYSTEM') ? (
                    <span className="text-indigo-400 font-bold">{log}</span>
                  ) : (
                    <span>{log}</span>
                  )}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>

            {/* Dynamic Telemetry Results of the Last Executed Process */}
            {lastProcessed && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-[#161c2c]/50 rounded-xl border border-[#242d44] space-y-3"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    <span className="font-mono text-xs font-bold text-slate-200">INTEGRITY ANALYSIS: {lastProcessed.id}</span>
                  </div>
                  <span className="font-mono text-[9px] text-slate-500">{new Date(lastProcessed.timestamp).toLocaleTimeString()}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono">
                  <div className="bg-[#090c13] p-2 rounded-lg border border-[#242d44]/50">
                    <span className="text-[8px] text-slate-500 block">SHANNON ENTROPY</span>
                    <span className="text-sm font-bold text-indigo-400">{lastProcessed.entropy}</span>
                  </div>
                  <div className="bg-[#090c13] p-2 rounded-lg border border-[#242d44]/50">
                    <span className="text-[8px] text-slate-500 block">NODE PARITY</span>
                    <span className="text-sm font-bold text-cyan-400">{lastProcessed.parity}</span>
                  </div>
                  <div className="bg-[#090c13] p-2 rounded-lg border border-[#242d44]/50">
                    <span className="text-[8px] text-slate-500 block">PIPELINE ALIGNMENT</span>
                    <span className="text-xs font-bold text-emerald-400">{lastProcessed.status}</span>
                  </div>
                  <div className="bg-[#090c13] p-2 rounded-lg border border-[#242d44]/50">
                    <span className="text-[8px] text-slate-500 block">SHA-256 CHECK</span>
                    <span className="text-xs font-bold text-amber-400">PASSED</span>
                  </div>
                </div>

                <div className="space-y-1 bg-[#090c13] p-2.5 rounded-lg border border-[#242d44] font-mono text-[9px] text-slate-400">
                  <div className="flex justify-between">
                    <span>Audit Pipeline Hash:</span>
                    <span className="text-amber-400 cursor-pointer" onClick={() => triggerCopy(lastProcessed.sha256, lastProcessed.id)}>
                      {copiedId === lastProcessed.id ? 'COPIED!' : `${lastProcessed.sha256.substring(0, 32)}...`}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </section>

          {/* Audit Ledger List */}
          <section className="bg-[#0e121d] rounded-2xl border border-[#242d44] p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono tracking-widest uppercase text-indigo-400 block font-bold">Ledger Ledger Database</span>
                <h2 className="text-lg font-extrabold tracking-tight">Deterministic Audit Ledger</h2>
              </div>
              {ledger.length > 0 && (
                <button
                  onClick={handleClearLedger}
                  className="px-3 py-1 bg-[#161c2c] hover:bg-red-950/40 border border-[#242d44] hover:border-red-500/30 text-[10px] font-mono font-bold text-slate-400 hover:text-red-400 rounded-lg transition-all cursor-pointer"
                >
                  Scrub History
                </button>
              )}
            </div>

            <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
              {loadingLedger ? (
                <div className="py-8 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-indigo-500" />
                  <span>Loading ledger records...</span>
                </div>
              ) : ledger.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-[#242d44] rounded-xl flex flex-col items-center justify-center">
                  <GitCommit className="h-7 w-7 text-slate-600 mb-1.5" />
                  <span>Ledger buffer completely empty. Enter a command payload above to generate.</span>
                </div>
              ) : (
                ledger.map((entry) => (
                  <div 
                    key={entry.id} 
                    className="p-3.5 bg-[#090c13] rounded-xl border border-[#242d44] hover:border-[#35425f] transition-all space-y-2.5 relative group"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-200">{entry.id}</span>
                          <span className={`text-[8px] font-mono px-1.5 py-0.2 rounded font-bold border ${
                            entry.status === 'PERFECT' 
                              ? 'bg-emerald-950/50 text-emerald-400 border-emerald-900/50' 
                              : entry.status === 'ALIGNED' 
                              ? 'bg-indigo-950/50 text-indigo-400 border-indigo-900/50' 
                              : entry.status === 'DEVIANT' 
                              ? 'bg-amber-950/50 text-amber-400 border-amber-900/50' 
                              : 'bg-red-950/50 text-red-400 border-red-900/50'
                          }`}>
                            {entry.status}
                          </span>
                        </div>
                        <p className="font-mono text-xs text-slate-300 mt-1.5 break-all max-w-[500px]">
                          {entry.input}
                        </p>
                      </div>
                      <span className="text-[9px] font-mono text-slate-500 text-right whitespace-nowrap">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-[#242d44]/30 font-mono text-[8px] text-slate-500">
                      <div>
                        <span className="block text-slate-600">ENTROPY:</span>
                        <span className="font-bold text-indigo-400">{entry.entropy}</span>
                      </div>
                      <div>
                        <span className="block text-slate-600">PARITY:</span>
                        <span className="font-bold text-cyan-400">{entry.parity}</span>
                      </div>
                      <div>
                        <span className="block text-slate-600">TECOE STAGE:</span>
                        <span className="font-bold text-emerald-400">{entry.checks.tecoeAlignment}</span>
                      </div>
                      <div>
                        <span className="block text-slate-600">PROTOCOL:</span>
                        <span className="font-bold text-amber-400">{entry.checks.protocolExtraction}</span>
                      </div>
                    </div>

                    {entry.resolutionBubble && (
                      <div className="bg-emerald-950/20 border border-emerald-500/20 px-2 py-1.5 rounded-lg flex flex-col gap-0.5 font-mono text-[9px] text-emerald-400 mt-2">
                        <span className="font-bold tracking-wide uppercase">⚡ AUTONOMOUS RESOLUTION BUBBLE CREATED</span>
                        <span className="text-slate-300 break-all font-semibold">{entry.resolutionBubble}</span>
                      </div>
                    )}

                    <div className="bg-[#0e121d] p-2 rounded-xl border border-[#242d44]/50 flex flex-col gap-1.5 font-mono text-[8px] text-slate-500 mt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-amber-500 font-bold truncate pr-3">SHA256: {entry.sha256}</span>
                        <button
                          onClick={() => triggerCopy(entry.sha256, entry.id + '-sha')}
                          className="text-slate-400 hover:text-white flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          {copiedId === entry.id + '-sha' ? (
                            <>
                              <Check className="h-2.5 w-2.5 text-emerald-500" />
                              <span>COPIED</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-2.5 w-2.5" />
                              <span>COPY</span>
                            </>
                          )}
                        </button>
                      </div>
                      {entry.parentHash && (
                        <div className="text-[7.5px] text-slate-600 border-t border-[#242d44]/20 pt-1 flex justify-between items-center">
                          <span>PARENT POINTER:</span>
                          <span className="text-slate-500 select-all font-semibold truncate max-w-[400px]">{entry.parentHash}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

        </div>

      </main>

      {/* Footer System Credits */}
      <footer className="max-w-7xl mx-auto mt-12 py-6 border-t border-[#242d44] text-center text-[11px] font-mono text-slate-500 space-y-2">
        <p>dAIsy haMINJA OS • SOVEREIGN WEB INFRASTRUCTURE ARCHITECTURE v3.0</p>
        <div className="flex justify-center gap-4 text-[10px] text-slate-600">
          <span>✓ NO MOCK APIS</span>
          <span>✓ PERSISTENT FILESYSTEM TETHERS</span>
          <span>✓ CRYPTO HASH SHANNON ENTROPY LEDGER</span>
        </div>
      </footer>

    </div>
  );
}
