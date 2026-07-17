import React, { useState } from 'react';
import { Search, Filter, Clock, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react';

// Static Tailwind class maps (dynamic interpolation is purged by Tailwind JIT)
const PILL_CONFIG = {
  emerald: { wrap: 'bg-emerald-50 border-emerald-200/60', icon: 'bg-emerald-100', text: 'text-emerald-600' },
  amber:   { wrap: 'bg-amber-50  border-amber-200/60',   icon: 'bg-amber-100',   text: 'text-amber-600'   },
  rose:    { wrap: 'bg-rose-50   border-rose-200/60',    icon: 'bg-rose-100',    text: 'text-rose-600'    },
};

// ─── Dummy rows that always populate the table (for demo purposes) ────────
const DUMMY_TODAY = [
  { id: 'D01', student_id: 'STU001', name: 'Aarav Sharma',  enrollment_no: 'EN2024CS001', branch: 'Computer Engineering',         division: 'A', timestamp: '08:52:14', status: 'Present' },
  { id: 'D02', student_id: 'STU002', name: 'Ishita Patel',  enrollment_no: 'EN2024IT042', branch: 'Information Technology',        division: 'B', timestamp: '08:54:31', status: 'Present' },
  { id: 'D03', student_id: 'STU003', name: 'Kabir Verma',   enrollment_no: 'EN2024EC015', branch: 'Electronics & Communication',   division: 'A', timestamp: '09:01:05', status: 'Present' },
  { id: 'D04', student_id: 'STU004', name: 'Riya Sen',      enrollment_no: 'EN2024CS089', branch: 'Computer Engineering',         division: 'B', timestamp: '09:18:44', status: 'Late'    },
  { id: 'D05', student_id: 'STU005', name: 'Neha Gupta',    enrollment_no: 'EN2024CS023', branch: 'Computer Engineering',         division: 'A', timestamp: '08:49:02', status: 'Present' },
  { id: 'D06', student_id: 'STU006', name: 'Dev Malhotra',  enrollment_no: 'EN2024IT012', branch: 'Information Technology',        division: 'A', timestamp: '09:22:18', status: 'Late'    },
  { id: 'D07', student_id: 'STU007', name: 'Aryan Khanna',  enrollment_no: 'EN2024CS047', branch: 'Computer Engineering',         division: 'B', timestamp: '—',       status: 'Absent'  },
  { id: 'D08', student_id: 'STU008', name: 'Priya Nair',    enrollment_no: 'EN2024IT066', branch: 'Information Technology',        division: 'A', timestamp: '08:57:39', status: 'Present' },
  { id: 'D09', student_id: 'STU009', name: 'Rohan Tiwari',  enrollment_no: 'EN2024EC031', branch: 'Electronics & Communication',   division: 'B', timestamp: '—',       status: 'Absent'  },
  { id: 'D10', student_id: 'STU010', name: 'Sneha Joshi',   enrollment_no: 'EN2024CS078', branch: 'Computer Engineering',         division: 'A', timestamp: '09:05:12', status: 'Present' },
];

const STATUS_CONFIG = {
  Present: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200/60', dot: 'bg-emerald-500' },
  Late:    { cls: 'bg-amber-50  text-amber-700  border-amber-200/60',    dot: 'bg-amber-500'  },
  Absent:  { cls: 'bg-rose-50   text-rose-700   border-rose-200/60',     dot: 'bg-rose-400'   },
};

export default function TodayView({ logs }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');

  // Merge API logs with dummy rows (API rows take priority by student_id)
  const apiIds = new Set(logs.map(l => l.student_id));
  const merged = [
    ...logs,
    ...DUMMY_TODAY.filter(d => !apiIds.has(d.student_id)),
  ];

  const branches = [...new Set(merged.map(r => r.branch))];

  const filtered = merged.filter(r => {
    const q = search.toLowerCase();
    const matchQ = !q || r.name.toLowerCase().includes(q) || r.enrollment_no.toLowerCase().includes(q) || r.student_id.toLowerCase().includes(q);
    const matchS = !statusFilter || r.status === statusFilter;
    const matchB = !branchFilter || r.branch === branchFilter;
    return matchQ && matchS && matchB;
  });

  const counts = { Present: 0, Late: 0, Absent: 0 };
  merged.forEach(r => { if (counts[r.status] !== undefined) counts[r.status]++; });

  return (
    <div className="space-y-5 fade-up">
      {/* ── Summary pills ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Present', count: counts.Present, color: 'emerald', icon: CheckCircle },
          { label: 'Late',    count: counts.Late,    color: 'amber',   icon: Clock       },
          { label: 'Absent',  count: counts.Absent,  color: 'rose',    icon: AlertCircle },
        ].map(({ label, count, color, icon: Icon }) => {
          const cfg = PILL_CONFIG[color];
          return (
            <button
              key={label}
              onClick={() => setStatusFilter(s => s === label ? '' : label)}
              className={`flex items-center gap-3 p-4 rounded-2xl border transition-all hover:shadow-md cursor-pointer text-left ${
                statusFilter === label
                  ? `${cfg.wrap} shadow-sm`
                  : 'bg-white border-slate-100 hover:border-slate-200'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.icon}`}>
                <Icon className={`w-5 h-5 ${cfg.text}`} />
              </div>
              <div>
                <p className="text-xl font-black text-slate-800">{count}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
              </div>
            </button>
          );
        })}

      </div>

      {/* ── Controls ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, ID, or enrollment…"
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 bg-slate-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-slate-700"
          />
        </div>
        <div className="flex gap-2">
          {/* Branch filter */}
          <div className="relative">
            <select
              value={branchFilter}
              onChange={e => setBranchFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 bg-slate-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-slate-600 cursor-pointer"
            >
              <option value="">All Branches</option>
              {branches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          {/* Status filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 bg-slate-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-slate-600 cursor-pointer"
            >
              <option value="">All Status</option>
              <option value="Present">Present</option>
              <option value="Late">Late</option>
              <option value="Absent">Absent</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <th className="px-5 py-3.5 text-left w-28">Time</th>
                <th className="px-5 py-3.5 text-left">Student</th>
                <th className="px-5 py-3.5 text-left hidden md:table-cell">Enrollment</th>
                <th className="px-5 py-3.5 text-left hidden lg:table-cell">Branch</th>
                <th className="px-5 py-3.5 text-center w-16">Div</th>
                <th className="px-5 py-3.5 text-center w-28">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length > 0 ? filtered.map((row, i) => {
                const cfg = STATUS_CONFIG[row.status] || STATUS_CONFIG.Present;
                return (
                  <tr key={row.id || row.student_id} className={`hover:bg-slate-50/70 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{row.timestamp}</td>
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-slate-800 text-sm">{row.name}</p>
                      <p className="text-[10px] font-semibold text-slate-400">{row.student_id}</p>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500 hidden md:table-cell">{row.enrollment_no}</td>
                    <td className="px-5 py-3.5 text-[11px] text-slate-500 hidden lg:table-cell leading-tight">{row.branch}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="text-[11px] font-black text-slate-500">{row.division}</span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${cfg.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {row.status}
                      </span>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center text-slate-400">
                    <Search className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                    <p className="font-semibold text-sm">No records match your filters</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[10px] font-semibold text-slate-400">Showing {filtered.length} of {merged.length} students</p>
          <p className="text-[10px] font-semibold text-slate-400">
            Total: {merged.length} · Present+Late: {counts.Present + counts.Late} · Absent: {counts.Absent}
          </p>
        </div>
      </div>
    </div>
  );
}
