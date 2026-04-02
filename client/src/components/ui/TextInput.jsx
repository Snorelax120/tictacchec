export default function TextInput({ label, className = '', ...props }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300/90">
        {label}
      </span>
      <input
        {...props}
        className={`mt-2.5 w-full rounded-2xl border border-white/10 bg-slate-950/85 px-4 py-3 text-base text-white outline-none transition focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-400/20 sm:mt-3 sm:px-5 sm:py-4 ${className}`}
      />
    </label>
  );
}
