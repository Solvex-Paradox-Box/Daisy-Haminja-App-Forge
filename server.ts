import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const currentDirname = typeof __dirname !== 'undefined'
  ? __dirname
  : path.dirname(fileURLToPath((import.meta as any).url));

const BOOT_TIME = Date.now();

const app = express();
app.use(express.json());

// Helper to get Gemini client gracefully
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// 1. GET metadata
app.get('/api/metadata', (req, res) => {
  try {
    const metadataPath = path.join(currentDirname, 'metadata.json');
    if (fs.existsSync(metadataPath)) {
      const data = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      res.json(data);
    } else {
      res.status(404).json({ error: 'metadata.json not found' });
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to read metadata: ' + error.message });
  }
});

// 2. POST update metadata
app.post('/api/metadata', (req, res) => {
  try {
    const { name, description } = req.body;
    const metadataPath = path.join(currentDirname, 'metadata.json');
    if (!fs.existsSync(metadataPath)) {
      return res.status(404).json({ error: 'metadata.json not found' });
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    if (typeof name === 'string') metadata.name = name;
    if (typeof description === 'string') metadata.description = description;

    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
    res.json({ success: true, metadata });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update metadata: ' + error.message });
  }
});

// 3. POST prompt-lab
app.post('/api/prompt-lab', async (req, res) => {
  try {
    const { prompt, model = 'gemini-3.5-flash' } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(400).json({ 
        error: 'Gemini API Key is not configured. Please add GEMINI_API_KEY in Settings > Secrets.' 
      });
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    res.json({ text: response.text || 'No response text generated.' });
  } catch (error: any) {
    console.error('Prompt Lab Error:', error);
    res.status(500).json({ error: error.message || 'Error occurred during prompt execution' });
  }
});

// 4. POST blueprint generator (structured JSON)
app.post('/api/blueprint', async (req, res) => {
  try {
    const { topic } = req.body;
    if (!topic) {
      return res.status(400).json({ error: 'A workspace topic or keywords is required' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(400).json({ 
        error: 'Gemini API Key is not configured. Please add GEMINI_API_KEY in Settings > Secrets.' 
      });
    }

    const systemInstruction = `You are a world-class Full-Stack App Architect. 
Your task is to take a user's app idea or keywords and design an exceptionally polished, minimal, and premium single-view dashboard app blueprint.
You must return a raw JSON object matching the exact schema specified. Keep descriptions highly inspirational and visually minded.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Design a premium, high-fidelity applet concept for the following topic/idea: "${topic}".`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          required: ['appName', 'tagline', 'themeName', 'colorPalette', 'uxConcept', 'suggestedComponents', 'recommendedFirestoreSchema'],
          properties: {
            appName: { type: Type.STRING, description: 'An elegant, crisp, literal name for the app (no generic suffixes like Pro or Flow)' },
            tagline: { type: Type.STRING, description: 'A highly descriptive 1-sentence tagline' },
            themeName: { type: Type.STRING, description: 'A descriptive name for the UI visual theme (e.g. Nordic Winter Slate, Sandstone Minimalist)' },
            colorPalette: {
              type: Type.ARRAY,
              description: 'Array of hex codes with descriptive roles (4 colors)',
              items: {
                type: Type.OBJECT,
                required: ['color', 'role', 'name'],
                properties: {
                  color: { type: Type.STRING, description: '#hex code' },
                  role: { type: Type.STRING, description: 'e.g. background, surface, text-primary, accent' },
                  name: { type: Type.STRING, description: 'Creative custom color name' }
                }
              }
            },
            uxConcept: { type: Type.STRING, description: 'A brief description of how the single-screen layout should be architected to optimize space' },
            suggestedComponents: {
              type: Type.ARRAY,
              description: '3 recommended custom UI components to build',
              items: {
                type: Type.OBJECT,
                required: ['name', 'purpose', 'visualDesign'],
                properties: {
                  name: { type: Type.STRING },
                  purpose: { type: Type.STRING, description: 'What user need this component fulfills' },
                  visualDesign: { type: Type.STRING, description: 'Visual design notes, typography, shadows, or spacing notes' }
                }
              }
            },
            recommendedFirestoreSchema: {
              type: Type.ARRAY,
              description: 'Recommended Firestore collections if persistence is added',
              items: {
                type: Type.OBJECT,
                required: ['collectionName', 'fieldsDescription'],
                properties: {
                  collectionName: { type: Type.STRING },
                  fieldsDescription: { type: Type.STRING, description: 'Fields and their types' }
                }
              }
            }
          }
        }
      }
    });

    const text = response.text || '{}';
    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error('Blueprint Generator Error:', error);
    res.status(500).json({ error: error.message || 'Error occurred during blueprint generation' });
  }
});

// --- SOVEREIGN CORES & DATA PERSISTENCE SERVICES ---

// Path definitions for persistence
const LEDGER_FILE = path.join(currentDirname, 'ledger.json');
const TETHERS_FILE = path.join(currentDirname, 'tethers.json');

// Helper to safely load JSON database
function loadJsonFile<T>(filePath: string, defaultData: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as T;
    }
  } catch (e) {
    console.error(`Error reading ${filePath}:`, e);
  }
  return defaultData;
}

// Helper to safely save JSON database
function saveJsonFile<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error(`Error writing ${filePath}:`, e);
  }
}

interface LedgerEntry {
  id: string;
  timestamp: string;
  input: string;
  entropy: number;
  parity: string; // 'ODD' | 'EVEN'
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

// Calculate Shannon entropy of string
function calculateEntropy(str: string): number {
  if (!str) return 0;
  const len = str.length;
  const freq: { [key: string]: number } = {};
  for (let i = 0; i < len; i++) {
    const char = str[i];
    freq[char] = (freq[char] || 0) + 1;
  }
  let entropy = 0;
  for (const char in freq) {
    const p = freq[char] / len;
    entropy -= p * Math.log2(p);
  }
  return parseFloat(entropy.toFixed(3));
}

function compressToTetherBubble(input: string): string {
  const words = input.split(/\s+/).filter(w => w.length > 2);
  const keyWords = Array.from(new Set(words))
    .map(w => w.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(Boolean)
    .slice(0, 4)
    .join('_')
    .toUpperCase();
  const hex = crypto.createHash('sha256').update(input).digest('hex').substring(0, 8).toUpperCase();
  return `CORE_BUBBLE_${hex}_[${keyWords || 'RAW_CONVERGENCE'}]`;
}

// POST Engine Process
function processEngineSequence(input: string): LedgerEntry {
  const trimmedInput = input.trim();
  const entropy = calculateEntropy(trimmedInput);
  const length = trimmedInput.length;
  
  // Evaluate status
  let status: 'PERFECT' | 'ALIGNED' | 'DEVIANT' | 'CRITICAL' = 'ALIGNED';
  if (entropy > 3.5 && length > 15) {
    status = 'PERFECT';
  } else if (entropy < 1.5 || length === 0) {
    status = 'CRITICAL';
  } else if (entropy > 2.8) {
    status = 'ALIGNED';
  } else {
    status = 'DEVIANT';
  }

  // Parity based on character code sum
  const charCodeSum = trimmedInput.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const parity = charCodeSum % 2 === 0 ? 'EVEN' : 'ODD';

  // Simulated TECOE pipeline checks
  const checks = {
    structureAudit: length > 0 ? 'PASSED' : 'EMPTY_PAYLOAD_WARNING',
    nodeParity: parity === 'EVEN' ? 'STABLE' : 'UNSTABLE_ASYMMETRIC',
    tecoeAlignment: status === 'PERFECT' || status === 'ALIGNED' ? 'SYNCHRONIZED' : 'DRIFT_DETECTED',
    protocolExtraction: trimmedInput.includes('{') || trimmedInput.includes('[') ? 'JSON_PROTOCOL' : 'RAW_PLAINTEXT'
  };

  // Load ledger first to link parent pointer
  const ledger = loadJsonFile<LedgerEntry[]>(LEDGER_FILE, []);
  const parentHash = ledger.length > 0 ? ledger[0].sha256 : '0000000000000000000000000000000000000000000000000000000000000000';

  // Scan for any active prioritized Paradox Tethers
  let prioritizedTether: Tether | null = null;
  try {
    const tethers = loadJsonFile<Tether[]>(TETHERS_FILE, []);
    prioritizedTether = tethers.find(t => t.status === 'active' && t.payload.toUpperCase().includes('PARADOX')) || null;
  } catch (e) {
    console.error('Error checking for prioritized paradox tethers:', e);
  }

  // Trigger Self-Correction compression loop if entropy is extremely high OR if guided by a prioritized PARADOX Tether
  let resolutionBubble: string | null = null;
  if (entropy > 4.5 || prioritizedTether) {
    const compressionSource = prioritizedTether 
      ? `${trimmedInput} [PRIORITIZED_PARADOX_ANCHOR: ${prioritizedTether.payload}]`
      : trimmedInput;
      
    resolutionBubble = compressToTetherBubble(compressionSource);
    
    // Auto-register Tether point
    try {
      const tethers = loadJsonFile<Tether[]>(TETHERS_FILE, []);
      const newTether: Tether = {
        id: 'TETH-' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        payload: resolutionBubble,
        timestamp: new Date().toISOString(),
        status: 'active'
      };
      tethers.unshift(newTether);
      saveJsonFile(TETHERS_FILE, tethers);
    } catch (err) {
      console.error('Error auto-creating Tether from resolution bubble:', err);
    }
  }

  // Add extra tracking metadata to checks if a paradox was prioritized
  if (prioritizedTether) {
    (checks as any).paradoxHeuristic = `PRIORITIZED_ANCHOR_ACTIVE: ${prioritizedTether.id}`;
  }

  const id = 'TX-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  const timestamp = new Date().toISOString();

  // Create entry object for serialization
  const rawEntry = {
    id,
    timestamp,
    input: trimmedInput,
    entropy,
    parity,
    checks,
    status,
    parentHash,
    resolutionBubble
  };

  // Calculate actual SHA-256 hash of the transaction entry for the audit ledger
  const hash = crypto.createHash('sha256').update(JSON.stringify(rawEntry)).digest('hex');
  
  const entry: LedgerEntry = {
    ...rawEntry,
    sha256: hash
  };

  // Prepend to ledger and trim
  ledger.unshift(entry);
  if (ledger.length > 100) ledger.pop();
  saveJsonFile(LEDGER_FILE, ledger);

  return entry;
}

app.post('/api/engine/process', (req, res) => {
  try {
    const { input } = req.body;
    if (typeof input !== 'string') {
      return res.status(400).json({ error: 'Input must be a raw string payload' });
    }

    const entry = processEngineSequence(input);
    res.json(entry);
  } catch (error: any) {
    console.error('Process Error:', error);
    res.status(500).json({ error: error.message || 'Internal process error' });
  }
});

// GET Audit Ledger
app.get('/api/ledger', (req, res) => {
  try {
    const ledger = loadJsonFile<LedgerEntry[]>(LEDGER_FILE, []);
    res.json(ledger);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST Clear Audit Ledger
app.post('/api/ledger/clear', (req, res) => {
  try {
    saveJsonFile(LEDGER_FILE, []);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET System Maturity Metrics
app.get('/api/status/maturity', (req, res) => {
  try {
    const ledger = loadJsonFile<LedgerEntry[]>(LEDGER_FILE, []);
    const uptimeSeconds = (Date.now() - BOOT_TIME) / 1000;
    const transactionCount = ledger.length;
    const systemMaturity = parseFloat((transactionCount / Math.max(uptimeSeconds, 0.1)).toFixed(6));
    res.json({
      status: 'OPERATIONAL',
      bootTime: new Date(BOOT_TIME).toISOString(),
      uptimeSeconds: parseFloat(uptimeSeconds.toFixed(2)),
      transactionCount,
      systemMaturity
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET Ledger Hash Verification Scan
app.get('/api/ledger/verify', (req, res) => {
  try {
    const ledger = loadJsonFile<LedgerEntry[]>(LEDGER_FILE, []);
    let integrity = true;
    const details: string[] = [];

    if (ledger.length === 0) {
      return res.json({
        verified: true,
        chainLength: 0,
        message: 'Audit chain is empty. Clear for incoming sequences.',
        details: ['No records to scan. Ledger is initialized and stable.']
      });
    }

    // Check elements from oldest to newest (index length - 1 down to 0)
    for (let i = ledger.length - 1; i >= 0; i--) {
      const entry = ledger[i];
      
      // Reconstruct rawEntry without sha256 to verify self-hash
      const { sha256, ...rawFields } = entry;
      const recalculatedHash = crypto.createHash('sha256').update(JSON.stringify(rawFields)).digest('hex');
      
      if (recalculatedHash !== sha256) {
        integrity = false;
        details.push(`Mismatched hash at transaction ${entry.id}. Calculated: ${recalculatedHash}, Stored: ${sha256}`);
        break;
      }

      // Check parent pointer match
      const expectedParentHash = (i === ledger.length - 1)
        ? '0000000000000000000000000000000000000000000000000000000000000000'
        : ledger[i + 1].sha256;

      const actualParentHash = entry.parentHash || '0000000000000000000000000000000000000000000000000000000000000000';

      if (actualParentHash !== expectedParentHash) {
        integrity = false;
        details.push(`Broken chain pointer at transaction ${entry.id}. Stored parentHash: ${entry.parentHash}, Actual: ${expectedParentHash}`);
        break;
      }
    }

    res.json({
      verified: integrity,
      chainLength: ledger.length,
      message: integrity 
        ? 'Sovereign audit chain is completely verified. Continuity and integrity of the TECOE pipeline remain unbroken.'
        : 'Chain validation failed: data drift or mutation detected.',
      details: details.length > 0 ? details : ['All nodes fully aligned in the 54-node TECOE pipeline.']
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET Tethers
app.get('/api/tethers', (req, res) => {
  try {
    const tethers = loadJsonFile<Tether[]>(TETHERS_FILE, []);
    res.json(tethers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST Create Tether
app.post('/api/tethers', (req, res) => {
  try {
    const { payload, status = 'active' } = req.body;
    if (typeof payload !== 'string' || !payload.trim()) {
      return res.status(400).json({ error: 'Payload is required' });
    }

    const tethers = loadJsonFile<Tether[]>(TETHERS_FILE, []);
    const newTether: Tether = {
      id: 'TETH-' + crypto.randomBytes(3).toString('hex').toUpperCase(),
      payload: payload.trim(),
      timestamp: new Date().toISOString(),
      status: status as any
    };

    tethers.unshift(newTether);
    saveJsonFile(TETHERS_FILE, tethers);
    res.json(newTether);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT Update Tether
app.put('/api/tethers/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { payload, status } = req.body;
    const tethers = loadJsonFile<Tether[]>(TETHERS_FILE, []);
    
    const index = tethers.findIndex(t => t.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Tether not found' });
    }

    if (typeof payload === 'string') {
      tethers[index].payload = payload.trim();
    }
    if (status === 'active' || status === 'suspended' || status === 'depleted') {
      tethers[index].status = status;
    }

    saveJsonFile(TETHERS_FILE, tethers);
    res.json(tethers[index]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE Tether
app.delete('/api/tethers/:id', (req, res) => {
  try {
    const { id } = req.params;
    let tethers = loadJsonFile<Tether[]>(TETHERS_FILE, []);
    
    const exists = tethers.some(t => t.id === id);
    if (!exists) {
      return res.status(404).json({ error: 'Tether not found' });
    }

    tethers = tethers.filter(t => t.id !== id);
    saveJsonFile(TETHERS_FILE, tethers);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Dev and Prod serving orchestration
// --- STEADY-STATE AUTONOMY ENGINE ---

let lastParadoxDetectionTime = BOOT_TIME;

function runIntegrityWatchdog() {
  console.log('[WATCHDOG] Initiating background cryptographic integrity scan...');
  try {
    const ledger = loadJsonFile<LedgerEntry[]>(LEDGER_FILE, []);
    if (ledger.length === 0) {
      console.log('[WATCHDOG] Ledger empty. Watchdog status: NOMINAL.');
      return;
    }

    let corruptIndex = -1;
    for (let i = ledger.length - 1; i >= 0; i--) {
      const entry = ledger[i];
      const { sha256, ...rawFields } = entry;
      const recalculatedHash = crypto.createHash('sha256').update(JSON.stringify(rawFields)).digest('hex');

      if (recalculatedHash !== sha256) {
        corruptIndex = i;
        break;
      }

      const expectedParentHash = (i === ledger.length - 1)
        ? '0000000000000000000000000000000000000000000000000000000000000000'
        : ledger[i + 1].sha256;

      const actualParentHash = entry.parentHash || '0000000000000000000000000000000000000000000000000000000000000000';
      if (actualParentHash !== expectedParentHash) {
        corruptIndex = i;
        break;
      }
    }

    if (corruptIndex !== -1) {
      console.warn(`[WATCHDOG] EMERGENCY: Cryptographic integrity violation at transaction index ${corruptIndex}!`);
      const validLedger = ledger.slice(corruptIndex + 1);
      saveJsonFile(LEDGER_FILE, validLedger);
      console.log(`[WATCHDOG] SUCCESS: Emergency state-reversion completed. Truncated ${corruptIndex + 1} corrupt entries. Remaining valid entries: ${validLedger.length}.`);
    } else {
      console.log('[WATCHDOG] Watchdog status: NOMINAL. Audit chain fully verified.');
    }
  } catch (error: any) {
    console.error('[WATCHDOG] Watchdog error:', error.message);
  }
}

function checkSystemIdleRescue() {
  try {
    const tethers = loadJsonFile<Tether[]>(TETHERS_FILE, []);
    const hasActiveParadoxTether = tethers.some(t => t.status === 'active' && t.payload.toUpperCase().includes('PARADOX'));
    
    if (hasActiveParadoxTether) {
      lastParadoxDetectionTime = Date.now();
      return;
    }

    const ledger = loadJsonFile<LedgerEntry[]>(LEDGER_FILE, []);
    const recentParadoxTx = ledger.find(entry => 
      entry.input.toUpperCase().includes('PARADOX') || 
      (entry.resolutionBubble && entry.resolutionBubble.toUpperCase().includes('PARADOX'))
    );

    if (recentParadoxTx) {
      const txTime = new Date(recentParadoxTx.timestamp).getTime();
      if (txTime > lastParadoxDetectionTime) {
        lastParadoxDetectionTime = txTime;
      }
    }

    const idleSeconds = (Date.now() - lastParadoxDetectionTime) / 1000;
    if (idleSeconds > 600) {
      console.log(`[IDLE_RESCUE] System idle duration (${idleSeconds.toFixed(1)}s) exceeded threshold of 600s. Launching Simulated Entropy Injection...`);
      const simulatedInput = `SIMULATED_INTERNAL_RECURSIVE_SIMULATION_${crypto.randomBytes(4).toString('hex').toUpperCase()}: AUTOMATED_STOCHASTIC_ENTROPY_INJECTION_TO_PREVENT_PIPELINE_STAGATION_PARADOX_ACTIVE_CONVERGENCE.`;
      const entry = processEngineSequence(simulatedInput);
      console.log(`[IDLE_RESCUE] Successfully processed Simulated Entropy Injection transaction: ${entry.id}`);
      lastParadoxDetectionTime = Date.now();
    }
  } catch (error: any) {
    console.error('[IDLE_RESCUE] Idle rescue check error:', error.message);
  }
}

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const PORT = 3000;

  if (!isProd) {
    // Lazy-load Vite dev server middleware in development
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files from production build directory
    const distPath = path.join(currentDirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Full-Stack App] Running on http://0.0.0.0:${PORT}`);
    
    // Fire first scan on start
    runIntegrityWatchdog();
    
    // Register steady-state watchdog interval (every 300 seconds)
    setInterval(runIntegrityWatchdog, 300000);
    
    // Register system idle rescue check interval (every 30 seconds)
    setInterval(checkSystemIdleRescue, 30000);
  });
}

startServer();
