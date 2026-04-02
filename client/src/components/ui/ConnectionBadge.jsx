export default function ConnectionBadge({ status, copyNotice }) {
  const colorClasses = {
    idle: 'border-slate-500/30 bg-slate-900/70 text-slate-200',
    connecting: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100',
    connected: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100',
    reconnecting: 'border-amber-400/30 bg-amber-500/10 text-amber-100',
    error: 'border-red-400/30 bg-red-500/10 text-red-100',
  };

  return (
    <div className={`max-w-full rounded-full border px-3.5 py-1.5 text-center text-[9px] font-black uppercase tracking-[0.16em] sm:px-4 sm:py-2 sm:text-xs sm:tracking-[0.24em] ${colorClasses[status] || colorClasses.idle}`}>
      {copyNotice || status}
    </div>
  );
}
