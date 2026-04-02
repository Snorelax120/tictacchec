export default function InlineNotice({ message }) {
  return (
    <div className="rounded-2xl border border-cyan-400/20 bg-slate-950/75 px-4 py-2.5 text-sm text-slate-200/90 sm:py-3">
      {message}
    </div>
  );
}
