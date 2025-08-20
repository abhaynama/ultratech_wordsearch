import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { initializeApp } from "firebase/app";
import { type Firestore, getFirestore, collection, addDoc, serverTimestamp, query, orderBy, limit, onSnapshot } from "firebase/firestore";

/**
 * UltraTech Vikram Cement Works – Timed Word‑Search (50‑Clue Event)
 * Mobile-first, strict 60s per clue, real-time leaderboard via Firebase.
 */

// -------------------
// 1) Firebase Init (Organizer: paste your config)
// -------------------
const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

let db: Firestore | null = null;
try {
  const app = initializeApp(FIREBASE_CONFIG);
  db = getFirestore(app);
} catch (e) {
  db = null; // Safe in local dev until you add config
}

// -------------------
// 2) Event Clues (50, single-word answers)
// -------------------
type Topic = "INDUSTRY" | "GK" | "LOGIC";
const CLUES: { clue: string; answer: string; topic: Topic }[] = [
  // UltraTech / Cement / Process (25)
  { clue: "Largest cement company in India", answer: "ULTRATECH", topic: "INDUSTRY" },
  { clue: "UltraTech plant at ______ Cement Works (MP)", answer: "VIKRAM", topic: "INDUSTRY" },
  { clue: "Primary raw material for cement", answer: "LIMESTONE", topic: "INDUSTRY" },
  { clue: "Intermediary nodules from kiln", answer: "CLINKER", topic: "INDUSTRY" },
  { clue: "Rotating furnace in cement plants", answer: "KILN", topic: "INDUSTRY" },
  { clue: "Sulfate added to control setting", answer: "GYPSUM", topic: "INDUSTRY" },
  { clue: "Mixture of cement, sand, water, aggregate", answer: "CONCRETE", topic: "INDUSTRY" },
  { clue: "Binding powder for concrete", answer: "CEMENT", topic: "INDUSTRY" },
  { clue: "Coarse and fine combined", answer: "AGGREGATE", topic: "INDUSTRY" },
  { clue: "Maintaining moisture to gain strength", answer: "CURING", topic: "INDUSTRY" },
  { clue: "Workability test with cone", answer: "SLUMP", topic: "INDUSTRY" },
  { clue: "Steel bars used for reinforcement", answer: "REBAR", topic: "INDUSTRY" },
  { clue: "Capacity to resist load", answer: "STRENGTH", topic: "INDUSTRY" },
  { clue: "Cement plus sand plus water", answer: "MORTAR", topic: "INDUSTRY" },
  { clue: "Mining site for limestone", answer: "QUARRY", topic: "INDUSTRY" },
  { clue: "Dust collection unit", answer: "BAGHOUSE", topic: "INDUSTRY" },
  { clue: "Tall storage structure", answer: "SILO", topic: "INDUSTRY" },
  { clue: "Particle size reduction step", answer: "GRINDING", topic: "INDUSTRY" },
  { clue: "Material added to modify properties", answer: "ADDITIVE", topic: "INDUSTRY" },
  { clue: "Volcanic ash type cement material", answer: "POZZOLAN", topic: "INDUSTRY" },
  { clue: "Byproduct used as cementitious material", answer: "FLYASH", topic: "INDUSTRY" },
  { clue: "Reaction of cement with water", answer: "HYDRATION", topic: "INDUSTRY" },
  { clue: "Time taken to become firm", answer: "SETTING", topic: "INDUSTRY" },
  { clue: "Ease of placing and compacting", answer: "WORKABILITY", topic: "INDUSTRY" },
  { clue: "Common cement type: Ordinary ______ cement", answer: "PORTLAND", topic: "INDUSTRY" },

  // General Knowledge (15)
  { clue: "Capital of Madhya Pradesh", answer: "BHOPAL", topic: "GK" },
  { clue: "River flowing through Delhi", answer: "YAMUNA", topic: "GK" },
  { clue: "Highest mountain on Earth", answer: "EVEREST", topic: "GK" },
  { clue: "Largest hot desert", answer: "SAHARA", topic: "GK" },
  { clue: "Planet known as Red Planet", answer: "MARS", topic: "GK" },
  { clue: "Fastest land animal", answer: "CHEETAH", topic: "GK" },
  { clue: "Hardest natural substance", answer: "DIAMOND", topic: "GK" },
  { clue: "River and rainforest giant", answer: "AMAZON", topic: "GK" },
  { clue: "Continent with most people", answer: "ASIA", topic: "GK" },
  { clue: "Currency of Japan", answer: "YEN", topic: "GK" },
  { clue: "Indian national game (traditionally)", answer: "HOCKEY", topic: "GK" },
  { clue: "Father of the Nation (India)", answer: "GANDHI", topic: "GK" },
  { clue: "Chemical element essential for breathing", answer: "OXYGEN", topic: "GK" },
  { clue: "Element forming diamonds and graphite", answer: "CARBON", topic: "GK" },
  { clue: "Metal with symbol Fe", answer: "IRON", topic: "GK" },

  // Logic / Riddles (10)
  { clue: "I speak without a mouth (one word)", answer: "ECHO", topic: "LOGIC" },
  { clue: "Follows you but not in the dark", answer: "SHADOW", topic: "LOGIC" },
  { clue: "Comes down but never goes up", answer: "RAIN", topic: "LOGIC" },
  { clue: "Gets wetter the more it dries", answer: "TOWEL", topic: "LOGIC" },
  { clue: "Has hands but cannot clap", answer: "CLOCK", topic: "LOGIC" },
  { clue: "The more you take, the more you leave", answer: "FOOTSTEPS", topic: "LOGIC" },
  { clue: "I can be wasted or saved, what am I?", answer: "TIME", topic: "LOGIC" },
  { clue: "I am golden when kept, broken when told", answer: "SECRET", topic: "LOGIC" },
  { clue: "I am not alive, but I grow: I need air", answer: "FIRE", topic: "LOGIC" },
  { clue: "I am yours but used by others", answer: "NAME", topic: "LOGIC" },
];

// -------------------
// 3) Grid + placement (batched)
// -------------------
const GRID_SIZE = 18;
const BATCH_SIZE = 12;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

type Dir = { dr: number; dc: number };
const DIRECTIONS: Dir[] = [
  { dr: 0, dc: 1 },   // →
  { dr: 0, dc: -1 },  // ←
  { dr: 1, dc: 0 },   // ↓
  { dr: -1, dc: 0 },  // ↑
  { dr: 1, dc: 1 },   // ↘
  { dr: 1, dc: -1 },  // ↙
  { dr: -1, dc: 1 },  // ↗
  { dr: -1, dc: -1 }, // ↖
];

type Cell = { ch: string; locked: boolean };
type WordPlacement = { word: string; path: { r: number; c: number }[] };

function emptyGrid(size: number): Cell[][] {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => ({ ch: "", locked: false })));
}

function canPlace(grid: Cell[][], r: number, c: number, dir: Dir, word: string) {
  const n = grid.length;
  for (let i = 0; i < word.length; i++) {
    const rr = r + dir.dr * i;
    const cc = c + dir.dc * i;
    if (rr < 0 || cc < 0 || rr >= n || cc >= n) return false;
    const ch = grid[rr][cc].ch;
    if (ch && ch !== word[i]) return false;
  }
  return true;
}

function tryPlaceWord(grid: Cell[][], word: string, preferCenter = false): WordPlacement | null {
  const n = grid.length;
  for (let attempt = 0; attempt < 400; attempt++) {
    const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
    const minR = dir.dr === -1 ? word.length - 1 : 0;
    const maxR = dir.dr === 1 ? n - word.length : n - 1;
    const minC = dir.dc === -1 ? word.length - 1 : 0;
    const maxC = dir.dc === 1 ? n - word.length : n - 1;

    const r = preferCenter
      ? Math.floor(n * 0.25) + Math.floor(Math.random() * Math.floor(n * 0.5))
      : Math.floor(Math.random() * (maxR - minR + 1)) + minR;
    const c = preferCenter
      ? Math.floor(n * 0.25) + Math.floor(Math.random() * Math.floor(n * 0.5))
      : Math.floor(Math.random() * (maxC - minC + 1)) + minC;

    if (!canPlace(grid, r, c, dir, word)) continue;

    const path: { r: number; c: number }[] = [];
    for (let i = 0; i < word.length; i++) {
      const rr = r + dir.dr * i;
      const cc = c + dir.dc * i;
      grid[rr][cc].ch = word[i];
      path.push({ r: rr, c: cc });
    }
    return { word, path };
  }
  return null;
}

function fillRandom(grid: Cell[][]) {
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid.length; c++) {
      if (!grid[r][c].ch) grid[r][c].ch = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
  }
}

function buildBatchGrid(allClues: typeof CLUES, activeIdx: number) {
  const batchIndex = Math.floor(activeIdx / BATCH_SIZE);
  const start = batchIndex * BATCH_SIZE;
  const end = Math.min(start + BATCH_SIZE, allClues.length);

  const g = emptyGrid(GRID_SIZE);
  const placements: Record<string, WordPlacement> = {};

  const activeWord = allClues[activeIdx].answer.toUpperCase().replace(/[^A-Z]/g, "");
  const first = tryPlaceWord(g, activeWord, true);
  if (first) placements[activeWord] = first;
  else {
    const again = tryPlaceWord(g, activeWord, false);
    if (again) placements[activeWord] = again;
  }

  const rest = allClues
    .slice(start, end)
    .map((b) => b.answer.toUpperCase().replace(/[^A-Z]/g, ""))
    .filter((w) => w && w !== activeWord)
    .sort((a, b) => b.length - a.length);

  for (const w of rest) {
    const placed = tryPlaceWord(g, w, false);
    if (placed) placements[w] = placed;
  }

  fillRandom(g);
  return { grid: g, placements, start, end };
}

// -------------------
// 4) Selection helpers
// -------------------
function sameLinePath(sr: number, sc: number, er: number, ec: number) {
  const dr = Math.sign(er - sr);
  const dc = Math.sign(ec - sc);
  const sameRow = sr === er;
  const sameCol = sc === ec;
  const diag = Math.abs(er - sr) === Math.abs(ec - sc);
  if (!(sameRow || sameCol || diag)) return [];
  const length = Math.max(Math.abs(er - sr), Math.abs(ec - sc)) + 1;
  const path: { r: number; c: number }[] = [];
  for (let i = 0; i < length; i++) path.push({ r: sr + dr * i, c: sc + dc * i });
  return path;
}

function lettersFromPath(grid: Cell[][], path: { r: number; c: number }[]) {
  return path.map(({ r, c }) => grid[r][c].ch).join("");
}

// -------------------
// 5) Leaderboard Hook
// -------------------
function useLeaderboard() {
  const [rows, setRows] = useState<{ name: string; score: number; time: number; at: string }[]>([]);
  useEffect(() => {
    if (!db) return;
    const q = query(
      collection(db, "ultratech_wordsearch_results"),
      orderBy("score", "desc"),
      orderBy("time", "asc"),
      orderBy("at", "desc"),
      limit(50)
    );
    const unsub = onSnapshot(q, (snap) => {
      const data: any[] = [];
      snap.forEach((doc) => {
        const d: any = doc.data();
        const at = (d.at && typeof d.at.toDate === "function") ? d.at.toDate().toLocaleString() : "";
        data.push({ name: d.name || "—", score: d.score || 0, time: d.time || 0, at });
      });
      setRows(data);
    });
    return () => unsub();
  }, []);
  return rows;
}

// -------------------
// 6) Main Component
// -------------------
export default function App() {
  const [name, setName] = useState("");
  const [started, setStarted] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [elapsed, setElapsed] = useState(0);
  const [score, setScore] = useState(0);

  const [{ grid }, setBatch] = useState(() => buildBatchGrid(CLUES, 0));

  useEffect(() => {
    setBatch(buildBatchGrid(CLUES, activeIdx));
    setSelStart(null); setSelEnd(null); setSelPath([]);
  }, [activeIdx]);

  useEffect(() => {
    if (!started) return;
    const tick1 = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    const tick2 = setInterval(() => setElapsed((t) => t + 1), 1000);
    return () => { clearInterval(tick1); clearInterval(tick2); };
  }, [started]);

  useEffect(() => {
    if (!started) return;
    if (timeLeft <= 0) advance();
  }, [timeLeft, started]);

  function startGame() {
    if (!name.trim()) return alert("Please enter your name");
    setActiveIdx(0);
    setTimeLeft(60);
    setElapsed(0);
    setScore(0);
    setStarted(true);
  }

  function finishGame() {
    setStarted(false);
    if (db) {
      addDoc(collection(db, "ultratech_wordsearch_results"), {
        name: name.trim(),
        score,
        time: elapsed,
        at: serverTimestamp(),
      }).catch(() => {});
    }
  }

  function advance() {
    if (activeIdx < CLUES.length - 1) {
      setActiveIdx((i) => i + 1);
      setTimeLeft(60);
    } else {
      finishGame();
    }
  }

  const gridRef = useRef<HTMLDivElement | null>(null);
  const [selStart, setSelStart] = useState<{ r: number; c: number } | null>(null);
  const [selEnd, setSelEnd] = useState<{ r: number; c: number } | null>(null);
  const [selPath, setSelPath] = useState<{ r: number; c: number }[]>([]);

  function handleSelectStart(r: number, c: number) {
    if (!started) return;
    setSelStart({ r, c });
    setSelEnd({ r, c });
    setSelPath([{ r, c }]);
  }

  function handleSelectMove(r: number, c: number) {
    if (!selStart) return;
    const path = sameLinePath(selStart.r, selStart.c, r, c);
    setSelEnd({ r, c });
    setSelPath(path.filter((p) => p.r >= 0 && p.c >= 0 && p.r < GRID_SIZE && p.c < GRID_SIZE));
  }

  function confirmSelection() {
    if (!selPath.length) return;
    const activeWord = CLUES[activeIdx].answer.toUpperCase().replace(/[^A-Z]/g, "");
    const picked = lettersFromPath(grid, selPath);
    const pickedRev = picked.split("").reverse().join("");
    const ok = picked === activeWord || pickedRev === activeWord;
    if (ok) {
      for (const { r, c } of selPath) grid[r][c].locked = true;
      setScore((s) => s + 1);
      setSelStart(null); setSelEnd(null); setSelPath([]);
      advance();
    } else {
      setSelStart(null); setSelEnd(null); setSelPath([]);
    }
  }

  function posToCell(clientX: number, clientY: number) {
    const el = gridRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const cw = rect.width / GRID_SIZE;
    const ch = rect.height / GRID_SIZE;
    const c = Math.floor((clientX - rect.left) / cw);
    const r = Math.floor((clientY - rect.top) / ch);
    if (r < 0 || c < 0 || r >= GRID_SIZE || c >= GRID_SIZE) return null;
    return { r, c };
  }
  function onTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    const t = e.touches[0];
    const cell = posToCell(t.clientX, t.clientY);
    if (cell) handleSelectStart(cell.r, cell.c);
  }
  function onTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    const t = e.touches[0];
    const cell = posToCell(t.clientX, t.clientY);
    if (cell) handleSelectMove(cell.r, cell.c);
  }
  function onTouchEnd() { confirmSelection(); }

  const isSelected = (r: number, c: number) => selPath.some((p) => p.r === r && p.c === c);

  const BrandBar = () => (
    <div className="flex items-center gap-3 py-2">
      <div className="w-8 h-8 rounded bg-amber-400 flex items-center justify-center font-black text-neutral-900">UT</div>
      <div>
        <div className="text-base md:text-lg font-extrabold tracking-wide">UltraTech Cement</div>
        <div className="text-[11px] uppercase tracking-widest text-neutral-500">Vikram Cement Works • Word‑Search Challenge</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900">
      <div className="max-w-6xl mx-auto p-4">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <BrandBar />
          <div className="flex items-center gap-2 text-xs md:text-sm">
            <span className="rounded-xl bg-neutral-900 text-amber-300 px-2 py-1">Timed</span>
            <span className="rounded-xl bg-amber-300 text-neutral-900 px-2 py-1">50 Clues</span>
            <span className="rounded-xl bg-neutral-200 px-2 py-1">Mobile</span>
          </div>
        </header>

        {!started && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2 bg-white rounded-2xl shadow p-4">
              <h2 className="text-lg font-semibold mb-2">Start Game</h2>
              <label className="block text-sm mb-1">Your Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter name" className="w-full rounded-xl border px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-amber-500" />
              <div className="text-sm mb-3">Total clues: <span className="font-semibold">{CLUES.length}</span> • Batch size: {BATCH_SIZE} • Grid: {GRID_SIZE}×{GRID_SIZE}</div>
              <button onClick={startGame} className="rounded-2xl px-4 py-2 bg-amber-500 text-neutral-900 font-extrabold shadow hover:bg-amber-400">Start</button>
              <p className="text-xs mt-3 opacity-70">Rule: 60 seconds per clue. Select letters in a straight line (↔ ↕ ↗ ↘). Forward or reverse counts.</p>
            </div>
            <div className="bg-white rounded-2xl shadow p-4">
              <h2 className="text-lg font-semibold mb-2">Leaderboard (Live)</h2>
              {!db && (
                <div className="text-xs mb-2 p-2 rounded bg-amber-100">Add Firebase config to enable live results.</div>
              )}
              <ol className="space-y-2 max-h-72 overflow-auto pr-2 text-sm">
                <div className="text-xs opacity-60">Results appear live here when configured.</div>
              </ol>
            </div>
          </motion.div>
        )}

        {started && (
          <div className="mt-4 grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2 bg-white rounded-2xl shadow p-3">
              <div className="flex items-center justify-between mb-2 text-sm">
                <div>Player: <span className="font-semibold">{name}</span></div>
                <div>Score: <span className="font-semibold">{score}</span> / {CLUES.length}</div>
              </div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold">Clue {activeIdx + 1} / {CLUES.length}</div>
                <div className={`rounded-xl px-3 py-1 text-sm font-semibold ${timeLeft <= 10 ? "bg-red-100 text-red-700" : "bg-amber-100 text-neutral-900"}`}>⏱ {timeLeft}s</div>
              </div>

              <div className="aspect-square">
                <div
                  ref={gridRef}
                  className="grid w-full h-full select-none"
                  style={{ gridTemplateColumns: `repeat(${18}, minmax(0,1fr))` }}
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                >
                  {Array.from({ length: 18 }).map((_, r) => (
                    <React.Fragment key={r}>
                      {Array.from({ length: 18 }).map((_, c) => {
                        const cell = grid[r][c];
                        const selected = isSelected(r, c);
                        return (
                          <button
                            key={`${r}-${c}`}
                            onMouseDown={() => handleSelectStart(r, c)}
                            onMouseEnter={(e) => (e.buttons === 1) && handleSelectMove(r, c)}
                            onMouseUp={confirmSelection}
                            className={`flex items-center justify-center border text-lg font-bold ${cell.locked ? "bg-amber-200" : selected ? "bg-amber-100" : "bg-white"}`}
                          >
                            {cell.ch}
                          </button>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow p-4 flex flex-col">
              <div className="text-[11px] uppercase tracking-wide text-neutral-500">Active Clue</div>
              <div className="text-base font-semibold mb-2">{CLUES[activeIdx].clue}</div>
              <div className="text-[11px] mb-4">
                <span className="rounded bg-neutral-100 px-2 py-0.5 mr-1">{CLUES[activeIdx].topic}</span>
                <span className="rounded bg-neutral-100 px-2 py-0.5">{CLUES[activeIdx].answer.length} letters</span>
              </div>

              <div className="mt-auto text-sm border-t pt-3">
                <div>Total Time: <span className="font-semibold">{Math.floor(elapsed/60)}m {elapsed%60}s</span></div>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => finishGame()} className="rounded-xl px-3 py-2 bg-neutral-200 hover:bg-neutral-300 text-sm">End</button>
                  <button onClick={() => { setTimeLeft(60); }} className="rounded-xl px-3 py-2 bg-amber-200 hover:bg-amber-300 text-sm">Restart Minute</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}