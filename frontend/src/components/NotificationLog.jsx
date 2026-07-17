import React from 'react';
import { Bell, Activity, CheckCircle, Clock, FileSpreadsheet, Zap } from 'lucide-react';

// ─── Dummy seed alerts that appear on first load ──────────────────────────
const SEED_ALERTS = [
  {
    event: 'student_present',
    timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    data: { student_id: 'STU005', name: 'Neha Gupta',   enrollment_no: 'EN2024CS023', branch: 'Computer Engineering', division: 'A', status: 'Present', timestamp: '08:49:02' },
  },
  {
    event: 'student_present',
    timestamp: new Date(Date.now() - 1000 * 60 * 7).toISOString(),
    data: { student_id: 'STU003', name: 'Kabir Verma',  enrollment_no: 'EN2024EC015', branch: 'Electronics & Comm.', division: 'A', status: 'Present', timestamp: '09:01:05' },
  },
  {
    event: 'student_present',
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    data: { student_id: 'STU004', name: 'Riya Sen',     enrollment_no: 'EN2024CS089', branch: 'Computer Engineering', division: 'B', status: 'Late',    timestamp: '09:18:44' },
  },
];

export default function NotificationLog({ alerts }) {
  const all = [...alerts, ...SEED_ALERTS].slice(0, 25);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col h-full min-h-[380px]">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
          <Bell className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800 text-sm">Teacher Alert Log</h3>
          <p className="text-[10px] text-slate-400 font-medium">Live SSE stream · auto-updates</p>
        </div>
        {all.length > 0 && (
          <span className="ml-auto w-5 h-5 bg-blue-600 text-white text-[9px] font-black rounded-full flex items-center justify-center">
            {all.length}
          </span>
        )}
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {all.length > 0 ? all.map((alert, i) => {
          const isSystem = alert.event === 'system_reset';
          const isLate   = alert.data?.status === 'Late';
          const relTime  = formatRelTime(alert.timestamp);

          return (
            <div
              key={i}
              className={`flex gap-3 p-3 rounded-xl text-xs transition-all border ${
                isSystem
                  ? 'bg-blue-50/50 border-blue-100'
                  : isLate
                    ? 'bg-amber-50/40 border-amber-100/60'
                    : 'bg-emerald-50/40 border-emerald-100/60'
              }`}
            >
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {isSystem ? (
                  <FileSpreadsheet className="w-4 h-4 text-blue-500" />
                ) : isLate ? (
                  <Clock className="w-4 h-4 text-amber-500" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className="font-bold text-slate-700 truncate">
                    {isSystem ? 'System' : alert.data?.name}
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono flex-shrink-0">{relTime}</span>
                </div>
                <p className="text-slate-500 leading-snug">
                  {isSystem
                    ? alert.data?.message
                    : (
                      <>
                        Marked{' '}
                        <span className={`font-bold ${isLate ? 'text-amber-700' : 'text-emerald-700'}`}>
                          {alert.data?.status}
                        </span>
                        {' '}by AI scanner
                      </>
                    )
                  }
                </p>
                {!isSystem && (
                  <p className="text-[9px] text-slate-400 mt-0.5 font-mono">
                    {alert.data?.student_id} · {alert.data?.branch?.split(' ')[0]} · Div {alert.data?.division}
                  </p>
                )}
              </div>
            </div>
          );
        }) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-10 text-slate-400">
            <Activity className="w-8 h-8 text-slate-200 animate-pulse mb-2" />
            <p className="text-sm font-semibold">Stream listening active</p>
            <p className="text-[11px] text-slate-400 mt-1 px-4">Recognition events will appear here in real-time.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function formatRelTime(iso) {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
