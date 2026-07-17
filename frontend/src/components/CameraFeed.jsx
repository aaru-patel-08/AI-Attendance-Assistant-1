import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Square, Users, Wifi, ChevronRight, Camera } from 'lucide-react';

/* ─── Dummy student seat positions (x%, y% of canvas) ─────────────────── */
const SEATS = [
  { id: 's1', x: 0.10, y: 0.30, w: 0.11, h: 0.24, name: 'Aarav S.',   color: '#3b82f6' },
  { id: 's2', x: 0.28, y: 0.28, w: 0.11, h: 0.24, name: 'Ishita P.',  color: '#8b5cf6' },
  { id: 's3', x: 0.46, y: 0.27, w: 0.11, h: 0.24, name: 'Kabir V.',   color: '#06b6d4' },
  { id: 's4', x: 0.64, y: 0.29, w: 0.11, h: 0.24, name: 'Riya S.',    color: '#ec4899' },
  { id: 's5', x: 0.82, y: 0.30, w: 0.11, h: 0.24, name: 'Neha G.',    color: '#10b981' },
  { id: 's6', x: 0.10, y: 0.62, w: 0.11, h: 0.24, name: 'Dev M.',     color: '#f59e0b' },
  { id: 's7', x: 0.28, y: 0.60, w: 0.10, h: 0.23, name: 'Aryan K.',   color: '#ef4444' },
  { id: 's8', x: 0.46, y: 0.61, w: 0.10, h: 0.23, name: 'Priya N.',   color: '#a855f7' },
  { id: 's9', x: 0.64, y: 0.62, w: 0.10, h: 0.23, name: 'Rohan T.',   color: '#14b8a6' },
];

/* ─── Draw helpers ──────────────────────────────────────────────────────── */
function lerp(a, b, t) { return a + (b - a) * t; }

function drawRoom(ctx, w, h) {
  /* floor */
  const floor = ctx.createLinearGradient(0, h * 0.55, 0, h);
  floor.addColorStop(0, '#1a2744');
  floor.addColorStop(1, '#111827');
  ctx.fillStyle = floor;
  ctx.fillRect(0, h * 0.55, w, h);

  /* ceiling / back wall */
  const wall = ctx.createLinearGradient(0, 0, 0, h * 0.55);
  wall.addColorStop(0, '#0d1829');
  wall.addColorStop(1, '#172040');
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, w, h * 0.55);

  /* whiteboard */
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.beginPath();
  ctx.roundRect(w * 0.20, h * 0.04, w * 0.60, h * 0.18, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  /* whiteboard text lines (dummy) */
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  [0.08, 0.12, 0.16].forEach(yp => {
    ctx.fillRect(w * 0.27, h * yp, w * 0.46, 2);
  });

  /* desk rows – perspective */
  [[0.38, 0.44, 0.06], [0.56, 0.40, 0.09], [0.74, 0.36, 0.12]].forEach(([yp, opacity, ht]) => {
    ctx.fillStyle = `rgba(30,58,138,${opacity})`;
    ctx.fillRect(0, h * yp, w, h * ht);
  });

  /* floor grid perspective lines */
  ctx.strokeStyle = 'rgba(59,130,246,0.08)';
  ctx.lineWidth = 0.8;
  for (let i = 0; i <= 12; i++) {
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.55);
    ctx.lineTo((w / 12) * i, h);
    ctx.stroke();
  }
  for (let j = 1; j <= 5; j++) {
    const yp = 0.55 + j * 0.09;
    ctx.beginPath();
    ctx.moveTo(0, h * yp);
    ctx.lineTo(w, h * yp);
    ctx.stroke();
  }
}

function drawSilhouette(ctx, cx, cy, r) {
  /* head */
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath();
  ctx.ellipse(cx, cy - r * 0.85, r * 0.38, r * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  /* shoulders / body */
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 0.15, r * 0.55, r * 0.52, 0, 0, Math.PI);
  ctx.fill();
}

function drawFaceBox(ctx, x, y, w, h, seat, state, frame) {
  const { detected, matchProgress, name, color } = state;
  if (!detected) return;

  const alpha = Math.min(1, state.fadeIn);
  const pulse = 0.5 + 0.5 * Math.sin(frame * 0.1);

  /* glow */
  ctx.shadowColor = matchProgress > 0.5 ? '#34d399' : color;
  ctx.shadowBlur = (matchProgress > 0.5 ? 18 : 10) * pulse;

  /* box */
  const progress = matchProgress;
  const strokeColor = progress > 0.5
    ? `rgba(52,211,153,${alpha * (0.7 + 0.3 * pulse)})`
    : `rgba(${hexToRgb(color)},${alpha * (0.65 + 0.25 * pulse)})`;

  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = progress > 0.5 ? 2.5 : 1.8;
  ctx.setLineDash(progress > 0.5 ? [] : [6, 4]);
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;

  /* corner L-brackets */
  const cs = 12;
  ctx.strokeStyle = progress > 0.5 ? '#34d399' : color;
  ctx.lineWidth = progress > 0.5 ? 3.5 : 2.5;
  ctx.shadowColor = ctx.strokeStyle;
  ctx.shadowBlur = 8;
  [[x, y+cs, x, y, x+cs, y],[x+w-cs, y, x+w, y, x+w, y+cs],
   [x+w, y+h-cs, x+w, y+h, x+w-cs, y+h],[x+cs, y+h, x, y+h, x, y+h-cs]]
  .forEach(([x1,y1,x2,y2,x3,y3]) => {
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.lineTo(x3,y3); ctx.stroke();
  });
  ctx.shadowBlur = 0;

  /* badge */
  const label = progress > 0.5 ? `✓ ${name}` : 'Analyzing...';
  ctx.font = `bold 10px Inter, sans-serif`;
  const tw = ctx.measureText(label).width;
  const bh2 = 18, bx2 = x, by2 = y - bh2 - 4;
  ctx.fillStyle = progress > 0.5 ? 'rgba(5,150,105,0.9)' : 'rgba(29,78,216,0.85)';
  ctx.beginPath();
  ctx.roundRect(bx2, by2, tw + 14, bh2, 4);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillText(label, bx2 + 7, by2 + 13);

  /* match progress bar */
  if (progress > 0 && progress < 1) {
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(x, y + h + 3, w, 3);
    ctx.fillStyle = `rgba(${hexToRgb(color)},0.9)`;
    ctx.fillRect(x, y + h + 3, w * progress, 3);
  }
}

function drawScanline(ctx, w, h, scanY) {
  const g = ctx.createLinearGradient(0, scanY - 16, 0, scanY + 16);
  g.addColorStop(0, 'rgba(59,130,246,0)');
  g.addColorStop(0.5, 'rgba(59,130,246,0.14)');
  g.addColorStop(1, 'rgba(59,130,246,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, scanY - 16, w, 32);
  ctx.strokeStyle = 'rgba(59,130,246,0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, scanY); ctx.lineTo(w, scanY); ctx.stroke();
}

function drawHUD(ctx, w, h, frame, detectedCount, recOn) {
  const now = new Date();
  const ts = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const ds = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = 'rgba(147,197,253,0.9)';
  ctx.fillText(`◷ ${ts}`, 12, 20);
  ctx.font = '10px monospace';
  ctx.fillStyle = 'rgba(148,163,184,0.7)';
  ctx.fillText(ds, 12, 34);
  ctx.fillText('CAM-01 · CLASSROOM-A · 1080p', 12, h - 12);

  /* faces badge */
  const fc = `▣ ${detectedCount} FACE${detectedCount !== 1 ? 'S' : ''} DETECTED`;
  ctx.font = 'bold 10px monospace';
  const fcw = ctx.measureText(fc).width;
  ctx.fillStyle = detectedCount > 0 ? 'rgba(52,211,153,0.9)' : 'rgba(148,163,184,0.5)';
  ctx.fillText(fc, w - fcw - 12, 20);

  /* SCANNING dot */
  const pulse = 0.5 + 0.5 * Math.sin(frame * 0.12);
  ctx.fillStyle = `rgba(52,211,153,${0.5 + 0.5 * pulse})`;
  ctx.beginPath();
  ctx.arc(w - 10, 35, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = '10px monospace';
  ctx.fillStyle = `rgba(52,211,153,${0.6 + 0.4 * pulse})`;
  ctx.fillText('SCANNING', w - 80, 39);

  /* REC dot */
  if (recOn && Math.floor(frame / 35) % 2 === 0) {
    ctx.fillStyle = 'rgba(239,68,68,0.95)';
    ctx.beginPath(); ctx.arc(w - 10, h - 18, 5, 0, Math.PI * 2); ctx.fill();
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = 'rgba(239,68,68,0.85)';
    ctx.fillText('● REC', w - 52, h - 14);
  }
}

function drawCRTOverlay(ctx, w, h) {
  /* subtle scanline rows */
  ctx.fillStyle = 'rgba(0,0,0,0.04)';
  for (let y = 0; y < h; y += 3) {
    ctx.fillRect(0, y, w, 1);
  }
  /* vignette */
  const vg = ctx.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, h * 0.85);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

/* ─── Seat state machine ─────────────────────────────────────────────────── */
function initSeatStates() {
  return SEATS.map((s, i) => ({
    ...s,
    detected: true,
    fadeIn: 0,
    matchProgress: 0,
    matched: false,
    matchScheduled: 60 + i * 85, // stagger initial match times
    lastMatchAt: 0,
    recheckAt: 60 + i * 85 + 400,
  }));
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function CameraFeed({ students, onMockAlert }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const stateRef = useRef({
    frame: 0,
    scanY: -20,
    seats: initSeatStates(),
    studentQueue: [],
  });
  const [running, setRunning] = useState(false);
  const [matchTotal, setMatchTotal] = useState(0);

  const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const triggerMatch = useCallback(async (studentId) => {
    try {
      const res = await fetch(`${backendUrl}/api/simulate-detection?student_id=${studentId}`, { method: 'POST' });
      if (!res.ok) return;
      const data = await res.json();
      if (data.student) { onMockAlert(data.student); setMatchTotal(c => c + 1); }
    } catch (_) {}
  }, [backendUrl, onMockAlert]);

  /* ─── Draw loop ─── */
  useEffect(() => {
    if (!running) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Build student queue
    const q = [...students].sort(() => Math.random() - 0.5);
    stateRef.current.studentQueue = q;

    const tick = () => {
      const S = stateRef.current;
      S.frame++;
      const f = S.frame;
      const w = canvas.width;
      const h = canvas.height;

      /* ── Background ─────────────────────────────── */
      drawRoom(ctx, w, h);

      /* ── Silhouettes ─────────────────────────────── */
      S.seats.forEach(seat => {
        const bx = seat.x * w, by = seat.y * h, bw = seat.w * w, bh = seat.h * h;
        drawSilhouette(ctx, bx + bw / 2, by + bh * 0.35, bh * 0.55);
      });

      /* ── Scan line ───────────────────────────────── */
      S.scanY += 0.7;
      if (S.scanY > h + 20) S.scanY = -20;
      drawScanline(ctx, w, h, S.scanY);

      /* ── Seat state updates + face boxes ─────────── */
      let detectedCount = 0;
      S.seats = S.seats.map(seat => {
        let ns = { ...seat };

        /* fade in */
        if (ns.detected && ns.fadeIn < 1) ns.fadeIn = Math.min(1, ns.fadeIn + 0.04);

        /* start match progress */
        if (!ns.matched && f >= ns.matchScheduled && ns.matchProgress === 0) {
          ns.matchProgress = 0.01;
        }
        if (ns.matchProgress > 0 && ns.matchProgress < 1) {
          ns.matchProgress = Math.min(1, ns.matchProgress + 0.008);
        }

        /* fire SSE + reset after full match */
        if (ns.matchProgress >= 1 && !ns.matched) {
          ns.matched = true;
          ns.lastMatchAt = f;
          const nextStu = S.studentQueue.shift();
          if (nextStu) {
            triggerMatch(nextStu.student_id);
            if (S.studentQueue.length === 0) {
              S.studentQueue = [...students].sort(() => Math.random() - 0.5);
            }
          }
          /* Schedule re-scan for this seat */
          ns.recheckAt = f + 500 + Math.random() * 300;
        }

        /* Re-scan cycle */
        if (ns.matched && f >= ns.recheckAt) {
          ns.matched = false;
          ns.matchProgress = 0;
          ns.matchScheduled = f + 60;
        }

        if (ns.detected) detectedCount++;

        const bx = seat.x * w, by = seat.y * h, bw = seat.w * w, bh = seat.h * h;
        drawFaceBox(ctx, bx, by, bw, bh, seat, ns, f);
        return ns;
      });

      /* ── CRT / vignette ──────────────────────────── */
      drawCRTOverlay(ctx, w, h);

      /* ── HUD ─────────────────────────────────────── */
      drawHUD(ctx, w, h, f, detectedCount, true);

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [running, students, triggerMatch]);

  /* Draw static idle canvas */
  useEffect(() => {
    if (running) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    drawRoom(ctx, w, h);
    SEATS.forEach(seat => {
      drawSilhouette(ctx, seat.x * w + seat.w * w / 2, seat.y * h + seat.h * h * 0.35, seat.h * h * 0.55);
    });
    drawCRTOverlay(ctx, w, h);
    /* Idle overlay */
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, w, h);
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.fillStyle = 'rgba(148,163,184,0.7)';
    ctx.textAlign = 'center';
    ctx.fillText('FEED PAUSED — Click START to begin AI scanning', w / 2, h / 2);
    ctx.textAlign = 'left';
  }, [running]);

  const handleManualSim = async (studentId) => {
    try {
      const res = await fetch(`${backendUrl}/api/simulate-detection?student_id=${studentId}`, { method: 'POST' });
      const data = await res.json();
      if (data.student) onMockAlert(data.student);
    } catch (_) {}
  };

  return (
    <div className="space-y-5">
      {/* ── Camera Panel ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`relative w-2.5 h-2.5 rounded-full ${running ? 'bg-emerald-500' : 'bg-slate-300'}`}>
              {running && <span className="live-dot absolute inset-0 rounded-full text-emerald-500" />}
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-base">Classroom Live Feed · CAM-01</h2>
              <p className="text-xs text-slate-400">
                {running ? `AI scanning · ${matchTotal} student${matchTotal !== 1 ? 's' : ''} identified` : 'Simulated CCTV stream — Classroom A'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {running && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200/60 px-3 py-1.5 rounded-lg">
                <Wifi className="w-3.5 h-3.5" /> LIVE
              </span>
            )}
            <button
              onClick={() => setRunning(r => !r)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${
                running
                  ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200/60'
                  : 'bg-gradient-to-r from-blue-700 to-blue-500 text-white hover:from-blue-800 hover:to-blue-600 shadow-blue-200'
              }`}
            >
              {running
                ? <><Square className="w-4 h-4 fill-current" /> Stop</>
                : <><Play className="w-4 h-4 fill-current" /> Start Demo Feed</>}
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="relative bg-slate-950">
          <canvas
            ref={canvasRef}
            width={1280}
            height={560}
            className="w-full h-auto block"
          />
          {/* Scanline overlay via CSS */}
          {running && <div className="camera-scanline" />}
        </div>

        {/* Status bar */}
        <div className="px-5 py-2.5 bg-slate-950 flex items-center justify-between text-[10px] font-mono border-t border-white/5">
          <span className="text-slate-500">RESOLUTION: 1280×560 · CODEC: H.264 · 30fps</span>
          <span className="text-slate-500">AI ENGINE: OpenCV Haar Cascade · BACKEND: FastAPI</span>
        </div>
      </div>

      {/* ── Demo Simulators ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Quick Scan Simulators
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Tap any student to instantly fire the recognition pipeline + popup.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {students.map((stu) => (
            <button
              key={stu.student_id}
              onClick={() => handleManualSim(stu.student_id)}
              className="group flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-blue-50 hover:border-blue-200/60 hover:shadow-md hover:shadow-blue-50 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-200 border border-slate-200 flex-shrink-0 shadow-sm">
                <img
                  src={stu.profile_pic?.startsWith('http') ? stu.profile_pic : `${backendUrl}${stu.profile_pic}`}
                  alt={stu.name}
                  className="w-full h-full object-cover"
                  onError={e => { e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${stu.name}&backgroundColor=1d4ed8&textColor=ffffff`; }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-slate-700 truncate group-hover:text-blue-700">{stu.name}</p>
                <p className="text-[9px] text-slate-400 font-semibold">{stu.student_id} · Div {stu.division}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 flex-shrink-0 transition-colors" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
