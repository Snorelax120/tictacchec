import ActionButton from './ActionButton.jsx';

export default function LobbyCodeCard({ code, onCopy, copyNotice, socketStatus }) {
  return (
    <div className="rounded-[1.5rem] border border-cyan-400/20 bg-gradient-to-br from-slate-950/80 via-slate-900/80 to-cyan-950/40 p-3.5 sm:rounded-[1.75rem] sm:p-6">
      <p className="text-center text-xs font-black uppercase tracking-[0.35em] text-cyan-300/90">
        Share This Lobby Code
      </p>
      <div className="mt-3 flex flex-col items-center gap-3 text-center sm:mt-4 sm:gap-4">
        <p className="break-all text-center text-[1.7rem] font-black tracking-[0.16em] text-white sm:text-5xl sm:tracking-[0.35em]">
          {code}
        </p>
        <ActionButton onClick={onCopy} tone="cyan" className="w-full sm:w-auto">
          Copy Code
        </ActionButton>
      </div>
      <p className="mt-4 text-center text-sm text-slate-300/85">
        Socket status: <span className="font-semibold text-white">{socketStatus}</span>
      </p>
      {copyNotice && (
        <p className="mt-2 text-center text-sm text-cyan-200">
          {copyNotice}
        </p>
      )}
    </div>
  );
}
