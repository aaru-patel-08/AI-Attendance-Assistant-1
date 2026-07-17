import React, { useState, useEffect } from 'react';
import {
  Tv, TableProperties, CalendarDays, Download, FolderArchive,
  RefreshCw, Info, FileDown,
} from 'lucide-react';

import TodayView from './TodayView';
import MonthlyView from './MonthlyView';
import CameraFeed from './CameraFeed';
import NotificationLog from './NotificationLog';

// ─── Dummy quick stats for the hero area ──────────────────────────────────
const QUICK_STATS = [
  { label: 'Present Today',  value: '7',   sub: 'out of 10', trend: '+2 vs yesterday', up: true,  color: 'emerald' },
  { label: 'Avg Attendance', value: '84%', sub: 'this month',trend: '+3% vs June',     up: true,  color: 'blue'    },
  { label: 'Late Entries',   value: '2',   sub: 'today',     trend: '–1 vs yesterday', up: false, color: 'amber'   },
  { label: 'At-Risk',        value: '1',   sub: 'students',  trend: '< 75% cutoff',    up: false, color: 'rose'    },
];

export default function TeacherPanel({ students, todayLogs, alertLogs, onRefreshToday, onMockAlert }) {
  const [tab, setTab] = useState('live');
  const [archives, setArchives] = useState([]);
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState('');
  const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    fetch(`${backendUrl}/api/attendance/archives`)
      .then(r => r.ok ? r.json() : [])
      .then(setArchives)
      .catch(() => setArchives([]));
  }, [backendUrl]);

  const handleReset = async () => {
    const m = prompt('Enter year-month to archive (YYYY-MM):', '2026-07');
    if (!m) return;
    setResetting(true); setResetMsg('');
    try {
      const res = await fetch(`${backendUrl}/api/attendance/reset?month=${m}`, { method: 'POST' });
      const data = await res.json();
      setResetMsg(data.message);
      fetch(`${backendUrl}/api/attendance/archives`).then(r => r.json()).then(setArchives).catch(() => {});
      onRefreshToday();
    } catch (e) {
      setResetMsg('Error: ' + e.message);
    }
    setResetting(false);
  };

  const TABS = [
    { id: 'live',  label: 'Live Scanner',    icon: Tv             },
    { id: 'day',   label: 'Day-to-Day',      icon: TableProperties },
    { id: 'month', label: 'Monthly View',    icon: CalendarDays   },
  ];

  return (
    <div className="space-y-6">
      {/* ── Hero header ── */}
      <div className="rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 px-8 py-7 relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute -right-10 -top-10 w-52 h-52 bg-white/5 rounded-full" />
          <div className="absolute -right-4 top-20 w-28 h-28 bg-white/5 rounded-full" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <p className="text-blue-300 text-xs font-bold uppercase tracking-widest mb-1">AI Attendance Assistant</p>
              <h1 className="text-2xl font-black text-white tracking-tight">Classroom Intelligence Hub</h1>
              <p className="text-blue-200/70 text-xs mt-1.5 font-medium">
                Real-time biometric scanning · Automated monthly archiving · CCTV integration
              </p>
            </div>
            {/* Quick stat pills */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {QUICK_STATS.map(s => (
                <div key={s.label} className="bg-white/10 backdrop-blur rounded-xl px-4 py-3 border border-white/10 min-w-[100px]">
                  <p className="text-white font-black text-xl">{s.value}</p>
                  <p className="text-blue-200/80 text-[9px] font-bold uppercase tracking-wider">{s.label}</p>
                  <p className={`text-[9px] font-semibold mt-0.5 ${s.up ? 'text-emerald-300' : 'text-rose-300'}`}>{s.trend}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tab bar attached to hero */}
        <div className="bg-white border-b border-slate-100 px-6 flex items-center gap-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-3.5 text-xs font-bold border-b-2 transition-all ${
                tab === id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main content: 2 columns */}
        <div className="xl:col-span-2 min-w-0">
          {tab === 'live'  && <CameraFeed students={students} onMockAlert={onMockAlert} />}
          {tab === 'day'   && <TodayView logs={todayLogs} />}
          {tab === 'month' && <MonthlyView />}
        </div>

        {/* Sidebar: 1 column */}
        <div className="space-y-5">
          {/* Alert Log */}
          <NotificationLog alerts={alertLogs} />

          {/* Archive Controls */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                <FolderArchive className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Spreadsheet Archive</h3>
                <p className="text-[10px] text-slate-400">Monthly Excel exports</p>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {resetMsg && (
                <div className="text-[11px] bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-2 rounded-xl">
                  {resetMsg}
                </div>
              )}

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`${backendUrl}/api/attendance/download-active`}
                  className="flex items-center justify-center gap-1.5 py-2.5 bg-gradient-to-r from-blue-700 to-blue-500 text-white rounded-xl text-[11px] font-bold hover:from-blue-800 hover:to-blue-600 transition-all shadow-sm shadow-blue-200"
                >
                  <Download className="w-3.5 h-3.5" /> Download Active
                </a>
                <button
                  onClick={handleReset}
                  disabled={resetting}
                  className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-600 rounded-xl text-[11px] font-bold transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} /> Reset & Archive
                </button>
              </div>

              {/* Archived list */}
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Previous Archives</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {archives.length > 0 ? archives.map(arch => (
                    <div key={arch.filename} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-blue-100 hover:bg-blue-50/30 transition-all">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-700 text-[10px] truncate">{arch.filename}</p>
                        <p className="text-[9px] text-slate-400">{arch.created_at} · {(arch.size_bytes / 1024).toFixed(1)} KB</p>
                      </div>
                      <a
                        href={`${backendUrl}/api/attendance/download-archive?filename=${arch.filename}`}
                        className="ml-2 p-1.5 bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-600 text-slate-500 rounded-lg transition-all flex-shrink-0"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )) : (
                    <p className="text-[10px] text-slate-400 text-center py-6 border border-dashed border-slate-200 rounded-xl">
                      No archived reports yet. Use Reset & Archive to generate one.
                    </p>
                  )}
                </div>
              </div>

              {/* Info note */}
              <div className="flex gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100 text-[10px] text-slate-400">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-slate-400" />
                <p className="leading-relaxed">
                  Auto-reset archives the previous month's data into a styled Excel sheet and starts a fresh tracking cycle.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
