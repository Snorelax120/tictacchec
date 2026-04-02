import ActionButton from '../ui/ActionButton.jsx';

export default function BottomStatusBar({
  className = '',
  notice,
  primaryActionLabel,
  onPrimaryAction,
  primaryActionDisabled,
  rematchState,
  compactMobile = false,
  ultraCompactMobile = false,
}) {
  if (!primaryActionLabel && !notice && !rematchState) {
    return null;
  }

  return (
    <div className={`mobile-ultra-compact-bottom mt-2 flex-shrink-0 rounded-[1.35rem] border border-white/10 bg-slate-950/75 shadow-[0_20px_60px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:mt-4 sm:rounded-[1.75rem] sm:px-4 sm:py-3 ${compactMobile ? 'px-3 py-2' : 'px-3 py-2.5'} ${ultraCompactMobile ? 'mobile-ultra-compact-bottom-shell' : ''} ${className}`}>
      <div className={`flex flex-col lg:flex-row lg:items-center lg:justify-between ${compactMobile ? 'gap-2' : 'gap-3'}`}>
        <div className="min-h-[1.5rem]">
          {notice && (
            <p className={`mobile-ultra-compact-bottom-text font-semibold text-slate-100 sm:text-base ${compactMobile ? 'text-[11px]' : 'text-xs'}`}>
              {notice}
            </p>
          )}
          {rematchState && (
            <p className={`mobile-ultra-compact-bottom-meta uppercase tracking-[0.16em] text-slate-400 sm:text-xs sm:tracking-[0.2em] ${notice ? 'mt-1' : ''} ${compactMobile ? 'text-[9px]' : 'text-[10px]'}`}>
              Rematch readiness: {Number(rematchState.whiteReady) + Number(rematchState.blackReady)} / 2
            </p>
          )}
        </div>
        <div className={`flex flex-col sm:flex-row sm:justify-end ${compactMobile ? 'gap-2' : 'gap-3'}`}>
          {primaryActionLabel && onPrimaryAction && (
            <ActionButton
              onClick={onPrimaryAction}
              tone="success"
              disabled={primaryActionDisabled}
              className={`mobile-ultra-compact-bottom-button w-full sm:w-auto ${compactMobile ? 'px-4 py-2 text-[11px] tracking-[0.08em] sm:text-sm' : ''}`}
            >
              {primaryActionLabel}
            </ActionButton>
          )}
        </div>
      </div>
    </div>
  );
}
