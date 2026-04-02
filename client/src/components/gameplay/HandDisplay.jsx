import ChessPiece from '../ChessPiece.jsx';

export default function HandDisplay({
  title,
  pieces,
  player,
  isActive,
  selectedPiece,
  onPieceClick,
  layout = 'panel',
  compact = false,
  ultraCompact = false,
  statusLabel = null,
  statusToneClassName = '',
  interactiveSummary = false,
}) {
  const resolvedStatusLabel = statusLabel || (isActive ? 'Ready' : 'Standby');
  const resolvedStatusToneClassName = statusLabel ? statusToneClassName : isActive ? 'text-yellow-300' : 'text-gray-400';

  if (layout === 'summary') {
    const summaryPieces = pieces.length > 0 ? pieces : [];

    return (
      <div
        className={`
          mobile-opponent-summary-card ${interactiveSummary ? 'mobile-current-hand-summary-card' : ''} grid w-full grid-cols-[auto_1fr_auto] items-center rounded-[1rem] border bg-gradient-to-r px-3 py-2 shadow-lg
          ${player === 'white' ? 'from-indigo-900/95 to-blue-950/95' : 'from-slate-800/95 to-gray-900/95'}
          ${isActive ? 'border-yellow-400/80 shadow-[0_0_20px_rgba(250,204,21,0.16)]' : 'border-gray-700/50'}
        `}
      >
        <p className="mobile-opponent-summary-title !text-[0.84rem] font-black uppercase leading-none tracking-[0.12em] text-gray-100">
          {title}
        </p>
        <div className="mobile-opponent-summary-pieces mobile-opponent-summary-pieces-large flex w-full items-center justify-center gap-1">
          {summaryPieces.length > 0 ? (
            summaryPieces.map((piece, index) => (
              interactiveSummary ? (
                <button
                  key={`${piece}-${index}`}
                  type="button"
                  onClick={() => onPieceClick(piece, player)}
                  disabled={!isActive}
                  className={`mobile-opponent-summary-piece mobile-current-hand-summary-piece flex items-center justify-center rounded-lg transition-all duration-300 ${
                    selectedPiece?.type === piece &&
                    selectedPiece?.player === player &&
                    selectedPiece?.from === null
                      ? 'bg-yellow-400/20 ring-2 ring-yellow-400 shadow-lg'
                      : isActive
                        ? 'hover:bg-white/10 hover:shadow-md'
                        : 'cursor-not-allowed opacity-50 grayscale-[0.5]'
                  }`}
                >
                  <ChessPiece
                    type={piece}
                    player={player}
                    direction={piece === 'pawn' ? (player === 'white' ? -1 : 1) : undefined}
                    iconClassName="text-[1.45rem]"
                  />
                </button>
              ) : (
                <span
                  key={`${piece}-${index}`}
                  className="mobile-opponent-summary-piece flex items-center justify-center"
                >
                  <ChessPiece
                    type={piece}
                    player={player}
                    direction={piece === 'pawn' ? (player === 'white' ? -1 : 1) : undefined}
                    iconClassName="text-[1.45rem]"
                  />
                </span>
              )
            ))
          ) : (
            <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-slate-500">Empty</span>
          )}
        </div>
        <span className={`mobile-opponent-summary-status text-[9px] font-black uppercase tracking-[0.12em] ${resolvedStatusToneClassName}`}>
          {resolvedStatusLabel}
        </span>
      </div>
    );
  }

  if (layout === 'tray') {
    const traySlots = [...pieces];

    while (traySlots.length < 4) {
      traySlots.push(null);
    }

    return (
      <div
        className={`
          mobile-ultra-compact-tray ${compact ? 'mobile-ultra-compact-tray-compact' : 'mobile-ultra-compact-tray-default'} flex w-full flex-shrink-0 flex-col rounded-[1.15rem] border-2 bg-gradient-to-br shadow-xl sm:rounded-[1.35rem] sm:p-3
          ${compact ? 'min-h-[6.75rem] !pt-3.5 px-2 pb-2.5' : 'min-h-[8rem] !pt-4 px-2.5 pb-2.5'}
          sm:min-h-[8.8rem]
          ${player === 'white' ? 'from-indigo-900 to-blue-950' : 'from-slate-800 to-gray-900'}
          ${isActive ? 'border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.2)]' : 'border-gray-700/50'}
        `}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className={`mobile-ultra-compact-tray-title ${compact ? 'mobile-ultra-compact-tray-title-compact !text-[1rem] sm:!text-[1rem]' : 'mobile-ultra-compact-tray-title-default !text-[1.15rem] sm:!text-[1.15rem]'} font-black uppercase tracking-[0.14em] text-gray-100 drop-shadow-md sm:tracking-[0.18em]`}>
            {title}
          </h2>
          <span className={`mobile-ultra-compact-tray-status font-black uppercase tracking-[0.12em] sm:text-[10px] sm:tracking-[0.16em] ${compact ? 'text-[8px]' : 'text-[9px]'} ${resolvedStatusToneClassName}`}>
            {resolvedStatusLabel}
          </span>
        </div>
        <div className={`mobile-ultra-compact-tray-grid-wrap ${compact ? 'mobile-ultra-compact-tray-grid-wrap-compact !mt-4' : 'mobile-ultra-compact-tray-grid-wrap-default !mt-5'} -mx-1 flex flex-1 pb-1 sm:mt-3 sm:min-h-[5.6rem] ${compact ? 'min-h-[4.15rem]' : 'min-h-[5rem]'}`}>
          <div className={`mobile-ultra-compact-tray-grid grid w-full grid-cols-4 px-1 sm:gap-2 ${compact ? 'gap-1' : 'gap-1.5'}`}>
            {traySlots.map((type, index) => {
              if (!type) {
                return (
                  <div
                    key={`empty-${index}`}
                    aria-hidden="true"
                    className={`rounded-xl border border-white/5 bg-black/10 opacity-0 sm:min-h-[5.6rem] ${compact ? 'min-h-[4.15rem]' : 'min-h-[5rem]'}`}
                  />
                );
              }

              const isSelected =
                selectedPiece?.type === type &&
                selectedPiece?.player === player &&
                selectedPiece?.from === null;

              return (
                <HandPieceButton
                  key={`${type}-${index}`}
                  type={type}
                  player={player}
                  isActive={isActive}
                  isSelected={isSelected}
                  onPieceClick={onPieceClick}
                  layout="tray"
                  compact={compact}
                  ultraCompact={ultraCompact}
                />
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        rounded-2xl border-2 bg-gradient-to-br shadow-xl transition-all duration-500
        ${compact ? 'p-3 lg:p-3.5' : 'p-4 lg:p-5'}
        ${player === 'white' ? 'from-indigo-900 to-blue-950' : 'from-slate-800 to-gray-900'}
        ${isActive ? 'border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.3)]' : 'border-gray-700/50'}
        flex w-full flex-col justify-start
        ${compact ? 'h-[330px] md:h-[360px] lg:h-[390px]' : 'h-[460px] md:h-[520px] lg:h-[560px]'}
      `}
    >
      <h2 className={`font-black uppercase tracking-[0.2em] text-center text-gray-200 drop-shadow-md ${compact ? 'mb-2 text-[11px] sm:text-xs' : 'mb-4 text-xs sm:text-sm'}`}>
        {title}
      </h2>
      <div className={`flex flex-1 flex-col justify-start ${compact ? 'gap-1.5 pt-0' : 'gap-2 pt-1'}`}>
        {pieces.map((type, index) => {
          const isSelected =
            selectedPiece?.type === type &&
            selectedPiece?.player === player &&
            selectedPiece?.from === null;

          return (
            <HandPieceButton
              key={`${type}-${index}`}
              type={type}
              player={player}
              isActive={isActive}
              isSelected={isSelected}
              onPieceClick={onPieceClick}
            />
          );
        })}
      </div>
      {pieces.length === 0 && (
        <p className={`text-center text-gray-500 italic ${compact ? 'py-2 text-xs' : 'py-4 text-sm'}`}>
          No pieces left
        </p>
      )}
    </div>
  );
}

function HandPieceButton({
  type,
  player,
  isActive,
  isSelected,
  onPieceClick,
  layout = 'panel',
  compact = false,
  ultraCompact = false,
}) {
  const defaultPawnDirection = type === 'pawn'
    ? player === 'white' ? -1 : 1
    : undefined;
  const isTray = layout === 'tray';
  const baseClasses = isTray
    ? `h-full w-full rounded-xl sm:px-3 sm:py-3 ${ultraCompact ? 'px-1 py-1' : compact ? 'px-1.5 py-1.5' : 'px-2 py-2.5'}`
    : `overflow-hidden rounded-xl ${compact ? 'px-2.5 pb-2 pt-3 sm:px-3 sm:pb-2.5 sm:pt-4' : 'px-3 pb-2.5 pt-4 sm:pb-3 sm:pt-5'}`;
  const pieceScaleClasses = isTray
    ? `drop-shadow-lg ${ultraCompact ? 'mb-0' : compact ? 'mb-0.5' : 'mb-1'}`
    : compact
      ? 'mb-0.5 translate-y-0.5 drop-shadow-lg scale-[0.92] sm:translate-y-1 sm:scale-100'
      : 'mb-1 translate-y-1 drop-shadow-lg scale-100 sm:translate-y-1.5 sm:scale-110';
  const pieceIconClassName = isTray
    ? ultraCompact ? 'text-[1.95rem] sm:text-[2.2rem]' : compact ? 'text-[1.5rem] sm:text-[2.2rem]' : 'text-[1.85rem] sm:text-[2.2rem]'
    : compact ? 'text-[2rem] sm:text-[2.45rem]' : 'text-[2.35rem] sm:text-[3.05rem]';
  const labelClasses = isTray
    ? ultraCompact ? 'mt-0 text-[7px] tracking-[0.08em] sm:text-[10px] sm:tracking-[0.16em]' : compact ? 'mt-0.5 text-[8px] tracking-[0.1em] sm:text-[10px] sm:tracking-[0.16em]' : 'mt-1 text-[9px] tracking-[0.12em] sm:text-[10px] sm:tracking-[0.16em]'
    : compact ? 'mt-1 text-[10px] sm:text-[11px] tracking-wider' : 'mt-2 text-[11px] sm:text-xs tracking-wider';

  return (
    <button
      type="button"
      onClick={() => onPieceClick(type, player)}
      disabled={!isActive}
      className={`
        ${ultraCompact && isTray ? 'mobile-ultra-compact-tray-piece' : ''}
        ${baseClasses}
        flex flex-col items-center transition-all duration-300
        ${isSelected ? 'scale-[1.02] bg-yellow-400/20 ring-4 ring-yellow-400 shadow-lg' : `${compact ? 'hover:bg-white/10 hover:shadow-md' : 'hover:scale-[1.01] hover:bg-white/10 hover:shadow-md'}`}
        ${!isActive ? 'cursor-not-allowed opacity-50 grayscale-[0.5]' : 'cursor-pointer'}
      `}
    >
      <div className={pieceScaleClasses}>
        <ChessPiece
          type={type}
          player={player}
          direction={defaultPawnDirection}
          iconClassName={pieceIconClassName}
        />
      </div>
      <p className={`${labelClasses} text-center font-bold uppercase text-gray-300 drop-shadow-sm`}>
        {type}
      </p>
    </button>
  );
}
