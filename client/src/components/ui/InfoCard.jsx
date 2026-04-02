export default function InfoCard({ title, value, detail }) {
  return (
    <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/60 p-4 sm:p-5">
      <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-300/85">
        {title}
      </p>
      <h2 className="mt-3 break-words text-xl font-black text-white sm:text-2xl">
        {value}
      </h2>
      <p className="mt-3 text-sm leading-6 text-slate-300/85">
        {detail}
      </p>
    </div>
  );
}
