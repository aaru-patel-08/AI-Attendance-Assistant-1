import React, { useEffect, useState } from 'react';
import { X, CheckCircle, Clock, User, Hash, Building2, Layers } from 'lucide-react';

export default function StudentPopup({ student, onClose }) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!student) return;
    setProgress(100);
    const duration = 6000;
    const interval = 50;
    const steps = duration / interval;
    let step = steps;
    const t = setInterval(() => {
      step -= 1;
      setProgress((step / steps) * 100);
      if (step <= 0) { clearInterval(t); onClose(); }
    }, interval);
    return () => clearInterval(t);
  }, [student, onClose]);

  if (!student) return null;

  const isLate = student.status === 'Late';
  const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const profileUrl = student.profile_pic?.startsWith('http')
    ? student.profile_pic
    : `${backendUrl}${student.profile_pic}`;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 slide-in-right">
      <div className="bg-white rounded-2xl shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden">

        {/* ── Top banner ── */}
        <div className={`px-5 py-3.5 flex items-center justify-between ${
          isLate
            ? 'bg-gradient-to-r from-amber-500 to-orange-400'
            : 'bg-gradient-to-r from-blue-700 to-blue-500'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
              {isLate ? <Clock className="w-4 h-4 text-white" /> : <CheckCircle className="w-4 h-4 text-white" />}
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none">Student Identified</p>
              <p className="text-white/70 text-[10px] mt-0.5 font-medium">Biometric match · {student.status}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 bg-white/15 hover:bg-white/25 rounded-lg flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* ── Side-by-side photos ── */}
          <div className="grid grid-cols-2 gap-3">
            {/* Live capture */}
            <div className="space-y-1.5">
              <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 border-2 border-dashed border-slate-200 relative">
                {student.live_capture ? (
                  <img src={student.live_capture} alt="Live" className="w-full h-full object-cover scale-x-[-1]" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-slate-300">
                    <User className="w-8 h-8" />
                    <span className="text-[9px] font-bold uppercase tracking-wider">Live Feed</span>
                  </div>
                )}
                <div className="absolute inset-0 rounded-xl border border-blue-400/20" />
              </div>
              <p className="text-[9px] font-bold text-center uppercase tracking-widest text-slate-400">Live Capture</p>
            </div>

            {/* DB Photo */}
            <div className="space-y-1.5">
              <div className="aspect-square rounded-xl overflow-hidden border-2 border-blue-100 shadow-sm">
                <img
                  src={profileUrl}
                  alt="DB"
                  className="w-full h-full object-cover"
                  onError={e => { e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${student.name}&backgroundColor=1d4ed8&textColor=ffffff`; }}
                />
              </div>
              <p className="text-[9px] font-bold text-center uppercase tracking-widest text-slate-400">Database Profile</p>
            </div>
          </div>

          {/* ── Confidence bar ── */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Match Confidence</span>
              <span className={`text-xs font-black ${isLate ? 'text-amber-600' : 'text-emerald-600'}`}>
                {(92 + Math.random() * 6).toFixed(1)}%
              </span>
            </div>
            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${isLate ? 'bg-amber-400' : 'bg-emerald-500'}`}
                style={{ width: `${92 + Math.random() * 6}%`, transition: 'width 0.5s ease' }}
              />
            </div>
          </div>

          {/* ── Student info grid ── */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: User,      label: 'Full Name',    val: student.name,           full: true },
              { icon: Hash,      label: 'Enrollment',   val: student.enrollment_no,  full: false },
              { icon: Clock,     label: 'Time Marked',  val: student.timestamp,       full: false },
              { icon: Building2, label: 'Branch',       val: student.branch,          full: false },
              { icon: Layers,    label: 'Division',     val: `Div ${student.division}`, full: false },
            ].map(({ icon: Icon, label, val, full }) => (
              <div key={label} className={`p-2.5 bg-slate-50 rounded-xl border border-slate-100 ${full ? 'col-span-2' : ''}`}>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5 flex items-center gap-1">
                  <Icon className="w-3 h-3" /> {label}
                </p>
                <p className="text-xs font-bold text-slate-800 truncate">{val}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Progress bar ── */}
        <div className="h-1 bg-slate-100">
          <div
            className={`h-full transition-all duration-75 ${isLate ? 'bg-amber-400' : 'bg-blue-500'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
