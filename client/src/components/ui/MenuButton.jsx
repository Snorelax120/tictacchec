export default function MenuButton({ title, description, tone, onClick }) {
  const toneClasses = {
    cyan: 'from-cyan-500 via-sky-500 to-blue-600 shadow-cyan-500/30',
    slate: 'from-slate-700 via-slate-800 to-slate-900 shadow-slate-950/40',
    blue: 'from-blue-600 via-indigo-600 to-sky-700 shadow-blue-600/30',
    teal: 'from-teal-500 via-cyan-500 to-sky-600 shadow-teal-500/30',
  };

  return (
    <button
      onClick={onClick}
      className={`group w-full flex-shrink rounded-[1.35rem] border border-white/10 bg-gradient-to-r ${toneClasses[tone]} p-[1px] text-left shadow-[0_18px_35px_rgba(15,23,42,0.35)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_42px_rgba(15,23,42,0.4)] sm:rounded-[1.6rem]`}
    >
      <span className="flex w-full flex-col gap-2 rounded-[1.28rem] bg-slate-950/90 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:rounded-[1.5rem] sm:px-6 sm:py-5">
        <span>
          <span className="block text-[15px] font-black uppercase tracking-[0.06em] text-white sm:text-xl sm:tracking-[0.12em]">
            {title}
          </span>
          <span className="mt-1 block text-xs leading-5 text-slate-300/85 sm:mt-2 sm:text-base sm:leading-6">
            {description}
          </span>
        </span>
        <span className="self-end text-xl font-black text-cyan-300 transition-transform duration-300 group-hover:translate-x-1 sm:self-auto sm:text-2xl">
          →
        </span>
      </span>
    </button>
  );
}
