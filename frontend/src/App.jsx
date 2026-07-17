import React, { useState, useEffect } from 'react';
import { ShieldCheck, Bell, ChevronDown, User } from 'lucide-react';
import TeacherPanel from './components/TeacherPanel';
import StudentPopup from './components/StudentPopup';

export default function App() {
  const [students, setStudents]         = useState([]);
  const [todayLogs, setTodayLogs]       = useState([]);
  const [alertLogs, setAlertLogs]       = useState([]);
  const [activeStudent, setActiveStudent] = useState(null);
  const [unread, setUnread]             = useState(0);

  const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const fetchStudents  = () => fetch(`${backendUrl}/api/students`).then(r => r.json()).then(setStudents).catch(() => {});
  const fetchTodayLogs = () => fetch(`${backendUrl}/api/attendance/today`).then(r => r.json()).then(setTodayLogs).catch(() => {});

  useEffect(() => {
    fetchStudents();
    fetchTodayLogs();

    const sse = new EventSource(`${backendUrl}/api/alerts`);
    sse.onmessage = e => {
      try {
        const p = JSON.parse(e.data);
        if (p.event === 'student_present') {
          setAlertLogs(prev => [p, ...prev].slice(0, 25));
          setActiveStudent(p.data);
          setUnread(u => u + 1);
          fetchTodayLogs();
        } else if (p.event === 'system_reset') {
          setAlertLogs(prev => [p, ...prev].slice(0, 25));
          fetchTodayLogs();
        }
      } catch (_) {}
    };
    return () => sse.close();
  }, [backendUrl]);

  const handleMockAlert = stu => {
    setActiveStudent(stu);
    setUnread(u => u + 1);
    fetchTodayLogs();
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* ── Topbar ── */}
      <header className="bg-white border-b border-slate-200 px-6 py-0 flex items-center justify-between h-14 sticky top-0 z-40 shadow-sm">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-700 to-blue-500 rounded-xl flex items-center justify-center shadow-sm shadow-blue-200">
            <ShieldCheck className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-black text-slate-800 text-sm tracking-tight">AttendAI</span>
            <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-100">PRO</span>
          </div>
        </div>

        {/* Centre breadcrumb */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 font-medium">
          <span className="text-slate-600 font-semibold">Semester II · 2026</span>
          <span>·</span>
          <span>CE Department</span>
          <span>·</span>
          <span className="text-blue-600 font-semibold">Section A / B</span>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Notification bell */}
          <button
            onClick={() => setUnread(0)}
            className="relative w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <Bell className="w-4 h-4 text-slate-600" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {/* Profile */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-700 to-blue-500 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-bold text-slate-700 hidden sm:block">Prof. Vivek Patel</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 p-6 max-w-screen-2xl mx-auto w-full">
        <TeacherPanel
          students={students}
          todayLogs={todayLogs}
          alertLogs={alertLogs}
          onRefreshToday={fetchTodayLogs}
          onMockAlert={handleMockAlert}
        />
      </main>

      {/* ── Real-time popup ── */}
      <StudentPopup student={activeStudent} onClose={() => setActiveStudent(null)} />
    </div>
  );
}
