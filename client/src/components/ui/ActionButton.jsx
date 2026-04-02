export default function ActionButton({
  children,
  onClick,
  tone = 'cyan',
  type = 'button',
  disabled = false,
  className = '',
  ariaLabel,
}) {
  const toneClasses = {
    cyan: 'from-cyan-500 to-blue-600 border-cyan-300/30 shadow-[0_10px_30px_rgba(6,182,212,0.24)]',
    slate: 'from-slate-800 to-slate-950 border-slate-600/70 shadow-none',
    success: 'from-green-600 to-emerald-700 border-green-300/20 shadow-[0_10px_30px_rgba(22,163,74,0.24)]',
    danger: 'from-red-600 to-rose-700 border-red-300/20 shadow-[0_10px_30px_rgba(220,38,38,0.24)]',
    teal: 'from-teal-500 to-cyan-600 border-cyan-200/25 shadow-[0_10px_30px_rgba(20,184,166,0.24)]',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`inline-flex appearance-none items-center justify-center overflow-hidden rounded-full border-2 bg-gradient-to-r bg-clip-padding px-4 py-2.5 text-xs font-black uppercase tracking-[0.1em] text-white transition-all duration-300 sm:px-7 sm:py-3 sm:text-base sm:tracking-[0.14em] ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:scale-105 active:scale-95'} ${toneClasses[tone]} ${className}`}
    >
      {children}
    </button>
  );
}
