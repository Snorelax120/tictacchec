import ActionButton from '../ui/ActionButton.jsx';
import ConnectionBadge from '../ui/ConnectionBadge.jsx';

export default function GameHeader({
  onBack,
  copyCode,
  onCopyCode,
  socketStatus,
  copyNotice,
  isOnlinePlay,
}) {
  const mobileHeaderButtonClass = 'mobile-ultra-compact-button h-10 w-full justify-center overflow-hidden rounded-[1rem] px-0 py-0 text-[9px] tracking-[0.04em] !border-slate-600/80 !from-slate-800 !to-slate-950 !shadow-none hover:scale-100 active:scale-100 sm:h-auto sm:px-3 sm:py-2 sm:text-[10px]';

  return (
    <>
      <div className="mobile-ultra-compact-header flex-shrink-0 md:hidden">
        <div className="grid grid-cols-[2.7rem_1fr_2.7rem] items-center gap-2 sm:grid-cols-[4.4rem_1fr_4.4rem] sm:gap-2">
          <ActionButton
            onClick={onBack}
            tone="slate"
            ariaLabel="Back to menu"
            className={mobileHeaderButtonClass}
          >
            <span aria-hidden="true" className="text-base leading-none sm:text-sm">←</span>
            <span className="sr-only sm:not-sr-only sm:ml-1">Menu</span>
          </ActionButton>
          <h1 className="mobile-ultra-compact-title justify-self-center text-center text-[1.95rem] font-black leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 drop-shadow-lg sm:text-[4.75rem]">
            TIC TAC CHEC
          </h1>
          {copyCode && onCopyCode ? (
            <ActionButton
              onClick={onCopyCode}
              tone="teal"
              ariaLabel="Copy code"
              className={mobileHeaderButtonClass}
            >
              <span aria-hidden="true" className="text-sm leading-none sm:hidden">⎘</span>
              <span className="hidden sm:inline">Copy</span>
            </ActionButton>
          ) : (
            <div className="w-full" />
          )}
        </div>
        {socketStatus && (
          <div className={`mobile-ultra-compact-badge mt-1.5 flex justify-center ${isOnlinePlay ? 'mobile-online-compact-connection-badge' : ''}`}>
            <ConnectionBadge status={socketStatus} copyNotice={copyNotice} />
          </div>
        )}
      </div>

      <div className="hidden md:grid md:mb-4 md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-3">
        <div className="flex flex-wrap justify-start gap-2 sm:gap-3">
          <ActionButton onClick={onBack} tone="slate" className="w-full px-4 py-2 text-xs tracking-[0.08em] sm:w-auto sm:px-5 sm:text-sm">
            ← Menu
          </ActionButton>
          {copyCode && onCopyCode && (
            <ActionButton onClick={onCopyCode} tone="teal" className="w-full sm:w-auto">
              Copy Code
            </ActionButton>
          )}
        </div>

        <h1 className="text-center text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 drop-shadow-lg md:text-6xl">
          TIC TAC CHEC
        </h1>

        <div className="flex justify-end">
          {socketStatus && <ConnectionBadge status={socketStatus} copyNotice={copyNotice} />}
        </div>
      </div>
    </>
  );
}
