import React, { useState, useEffect } from 'react';
import { Search, Download, Calendar, TrendingUp, Users, AlertTriangle, Award } from 'lucide-react';

// Static Tailwind class maps — dynamic interpolation is purged by Tailwind JIT
const METRIC_CONFIG = {
  blue:   { wrap: 'bg-blue-50',   text: 'text-blue-600'   },
  emerald:{ wrap: 'bg-emerald-50',text: 'text-emerald-600'},
  rose:   { wrap: 'bg-rose-50',   text: 'text-rose-600'   },
  violet: { wrap: 'bg-violet-50', text: 'text-violet-600' },
};

// ─── Dummy monthly data for richer demo ───────────────────────────────────
const DUMMY_STUDENTS = [
  { student_id:'STU001', name:'Aarav Sharma',  enrollment_no:'EN2024CS001', branch:'Computer Engineering',       division:'A' },
  { student_id:'STU002', name:'Ishita Patel',  enrollment_no:'EN2024IT042', branch:'Information Technology',      division:'B' },
  { student_id:'STU003', name:'Kabir Verma',   enrollment_no:'EN2024EC015', branch:'Electronics & Comm.',         division:'A' },
  { student_id:'STU004', name:'Riya Sen',       enrollment_no:'EN2024CS089', branch:'Computer Engineering',       division:'B' },
  { student_id:'STU005', name:'Neha Gupta',    enrollment_no:'EN2024CS023', branch:'Computer Engineering',       division:'A' },
  { student_id:'STU006', name:'Dev Malhotra',  enrollment_no:'EN2024IT012', branch:'Information Technology',      division:'A' },
  { student_id:'STU007', name:'Aryan Khanna',  enrollment_no:'EN2024CS047', branch:'Computer Engineering',       division:'B' },
  { student_id:'STU008', name:'Priya Nair',    enrollment_no:'EN2024IT066', branch:'Information Technology',      division:'A' },
];

// Simulate attendance % per student per day seed
function buildHistory(month) {
  const [y, m] = month.split('-').map(Number);
  const days = new Date(y, m, 0).getDate();
  const history = {};
  const pctSeeds = [0.94, 0.82, 0.97, 0.71, 1.0, 0.60, 0.88, 0.91];
  DUMMY_STUDENTS.forEach((stu, si) => {
    history[stu.student_id] = {};
    for (let d = 1; d <= days; d++) {
      const dt = new Date(y, m - 1, d);
      const isWeekend = dt.getDay() === 0 || dt.getDay() === 6;
      if (isWeekend) { history[stu.student_id][d] = 'Weekend'; continue; }
      const rand = Math.sin(si * 17 + d * 3.7) * 0.5 + 0.5; // deterministic pseudo-random
      const pct = pctSeeds[si];
      if (rand < pct) {
        history[stu.student_id][d] = rand < pct * 0.9 ? 'Present' : 'Late';
      } else {
        history[stu.student_id][d] = 'Absent';
      }
    }
  });
  return { days, history };
}

const CELL = {
  Present: 'bg-emerald-100 text-emerald-800 font-black',
  Late:    'bg-amber-100  text-amber-800  font-black',
  Absent:  'bg-rose-100   text-rose-700   font-black',
  Weekend: 'bg-slate-100  text-slate-300',
};

const MONTHS_OPTIONS = [
  { value: '2026-07', label: 'July 2026' },
  { value: '2026-06', label: 'June 2026' },
  { value: '2026-05', label: 'May 2026' },
];

export default function MonthlyView() {
  const [month, setMonth] = useState('2026-07');
  const [search, setSearch] = useState('');
  const [apiData, setApiData] = useState(null);
  const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    fetch(`${backendUrl}/api/attendance/monthly?month=${month}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setApiData(d))
      .catch(() => setApiData(null));
  }, [month, backendUrl]);

  // Build merged records
  const { days, history } = buildHistory(month);
  const dayNumbers = Array.from({ length: days }, (_, i) => i + 1);

  const records = DUMMY_STUDENTS.map((stu, si) => {
    // Try to use API data if available
    const apiRec = apiData?.records?.find(r => r.student_id === stu.student_id);
    const hist = apiRec ? apiRec.history : history[stu.student_id];
    // FIX: was using incorrect Date spread; use explicit year/month parsing
    const [mYear, mMon] = month.split('-').map(Number);
    const weekdays = dayNumbers.filter(d => {
      const dt2 = new Date(mYear, mMon - 1, d);
      return dt2.getDay() !== 0 && dt2.getDay() !== 6;
    });
    let present = 0;
    weekdays.forEach(d => {
      const s = hist?.[d] || 'Absent';
      if (s === 'Present' || s === 'Late') present++;
    });
    const pct = weekdays.length > 0 ? Math.round((present / weekdays.length) * 100) : 0;
    return { ...stu, history: hist || {}, present_days: present, total_weekdays: weekdays.length, attendance_percentage: pct };
  });

  const filtered = records.filter(r =>
    !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.enrollment_no.toLowerCase().includes(search.toLowerCase())
  );

  // Summary stats
  const avg = records.reduce((a, r) => a + r.attendance_percentage, 0) / records.length;
  const perfect = records.filter(r => r.attendance_percentage === 100).length;
  const atRisk  = records.filter(r => r.attendance_percentage < 75).length;
  const highest = Math.max(...records.map(r => r.attendance_percentage));

  return (
    <div className="space-y-5 fade-up">
      {/* ── Metrics row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: TrendingUp, label: 'Class Average',    val: `${avg.toFixed(1)}%`,   color: 'blue',   sub: `${month}` },
          { icon: Award,      label: 'Perfect Attendance',val: `${perfect}/${records.length}`, color:'emerald', sub: '100% attendance' },
          { icon: AlertTriangle, label: 'At-Risk Students', val: atRisk,              color: 'rose',   sub: 'Below 75%' },
          { icon: Users,      label: 'Total Enrolled',   val: records.length,         color: 'violet', sub: 'Registered students' },
        ].map(({ icon: Icon, label, val, color, sub }) => {
          const mcfg = METRIC_CONFIG[color] || METRIC_CONFIG.blue;
          return (
            <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${mcfg.wrap}`}>
                  <Icon className={`w-5 h-5 ${mcfg.text}`} />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-800">{val}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{label}</p>
              <p className="text-[10px] text-slate-400 mt-1">{sub}</p>
            </div>
          );
        })}
      </div>

      {/* ── Controls row ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="text-sm font-bold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
            >
              {MONTHS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search students…"
              className="pl-9 pr-4 py-2 text-sm border border-slate-200 bg-slate-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-slate-700 w-52"
            />
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
          {['Present','Late','Absent'].map(s => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded ${CELL[s].split(' ')[0]} flex items-center justify-center text-[8px] font-black ${s === 'Present' ? 'text-emerald-700' : s === 'Late' ? 'text-amber-700' : 'text-rose-600'}`}>
                {s[0]}
              </span>
              {s}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-100 text-slate-300 flex items-center justify-center text-[8px]">—</span>
            Weekend
          </span>
          <a
            href={`${backendUrl}/api/attendance/download-active?month=${month}`}
            className="ml-2 flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-[10px] font-bold"
          >
            <Download className="w-3 h-3" /> Export
          </a>
        </div>
      </div>

      {/* ── Grid table ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                <th className="px-4 py-3 text-left sticky left-0 bg-slate-50 z-10 border-r border-slate-100 min-w-[160px]">Student</th>
                <th className="px-3 py-3 text-left border-r border-slate-100 min-w-[80px]">Enrollment</th>
                {dayNumbers.map(d => {
                  const dt = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]) - 1, d);
                  const isWknd = dt.getDay() === 0 || dt.getDay() === 6;
                  return (
                    <th key={d} className={`px-0.5 py-3 text-center w-8 border-r border-slate-100 ${isWknd ? 'text-slate-300' : ''}`}>
                      {d}
                    </th>
                  );
                })}
                <th className="px-3 py-3 text-center border-r border-slate-100 min-w-[72px]">Days</th>
                <th className="px-3 py-3 text-center min-w-[60px]">Att.%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs">
              {filtered.map((rec, i) => {
                const pct = rec.attendance_percentage;
                return (
                  <tr key={rec.student_id} className={`hover:bg-blue-50/30 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}>
                    <td className="px-4 py-2.5 sticky left-0 z-10 bg-white border-r border-slate-100 shadow-[1px_0_4px_rgba(0,0,0,0.03)]">
                      <p className="font-bold text-slate-800 text-[11px]">{rec.name}</p>
                      <p className="text-[9px] text-slate-400 font-semibold">Div {rec.division}</p>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[9px] text-slate-400 border-r border-slate-100">{rec.enrollment_no}</td>
                    {dayNumbers.map(d => {
                      const status = rec.history?.[d] || 'Absent';
                      const cellCls = CELL[status] || CELL.Absent;
                      const label = status === 'Present' ? 'P' : status === 'Late' ? 'L' : status === 'Weekend' ? '—' : 'A';
                      return (
                        <td key={d} className="p-0.5 border-r border-slate-100">
                          <div className={`w-full h-6 rounded text-[9px] flex items-center justify-center ${cellCls}`}>{label}</div>
                        </td>
                      );
                    })}
                    <td className="px-3 py-2.5 text-center border-r border-slate-100 font-bold text-slate-600 text-[10px]">
                      {rec.present_days}/{rec.total_weekdays}
                    </td>
                    <td className={`px-3 py-2.5 text-center font-black text-[11px] ${
                      pct >= 90 ? 'text-emerald-600' : pct < 75 ? 'text-rose-600' : 'text-amber-600'
                    }`}>
                      {pct}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
