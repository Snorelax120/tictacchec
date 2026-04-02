import BoardGrid from './BoardGrid.jsx';
import BottomStatusBar from './BottomStatusBar.jsx';
import GameHeader from './GameHeader.jsx';
import HandDisplay from './HandDisplay.jsx';
import { getOnlineConnectionStatusInfo } from '../../lib/gameUi.js';

export default function GameScreen({
  board,
  currentTurn,
  selectedPiece,
  winner,
  blackHand,
  whiteHand,
  blackLabel,
  whiteLabel,
  topStatus,
  onSquareClick,
  onHandPieceClick,
  onBack,
  onPrimaryAction,
  primaryActionLabel,
  primaryActionDisabled = false,
  getPawnDirection,
  socketStatus,
  copyCode,
  onCopyCode,
  copyNotice,
  bottomNotice,
  rematchState,
  mobileHandPlayer = null,
  playerStatusLabels = null,
  isOnlinePlay = false,
}) {
  const showRematchReadiness = Boolean(winner && rematchState);
  const boardShellClassName = 'w-full max-w-none md:w-[35rem] md:max-w-[35rem] lg:w-[39rem] lg:max-w-[39rem]';
  const mobileBottomHandLabel = mobileHandPlayer === 'white'
    ? whiteLabel
    : mobileHandPlayer === 'black'
      ? blackLabel
      : '';
  const mobileBottomHandPieces = mobileHandPlayer === 'white'
    ? whiteHand
    : mobileHandPlayer === 'black'
      ? blackHand
      : [];
  const mobileOpponentPlayer = mobileHandPlayer === 'white'
    ? 'black'
    : mobileHandPlayer === 'black'
      ? 'white'
      : null;
  const mobileTopHandLabel = mobileOpponentPlayer === 'white'
    ? whiteLabel
    : mobileOpponentPlayer === 'black'
      ? blackLabel
      : '';
  const mobileTopHandPieces = mobileOpponentPlayer === 'white'
    ? whiteHand
    : mobileOpponentPlayer === 'black'
      ? blackHand
      : [];
  const mobileBottomHandStatus = mobileHandPlayer ? playerStatusLabels?.[mobileHandPlayer] ?? null : null;
  const mobileTopHandStatus = mobileOpponentPlayer ? playerStatusLabels?.[mobileOpponentPlayer] ?? null : null;
  const showMobileHands = Boolean(mobileHandPlayer);
  const mobileBottomHandIsActive = mobileHandPlayer === currentTurn && !winner;
  const mobileTopHandIsActive = mobileOpponentPlayer === currentTurn && !winner;
  const compactMobileEndgame = Boolean(winner && showMobileHands);
  const showTinyScreenOverlayAction = Boolean(primaryActionLabel && showMobileHands);
  const showCompactOnlineOverlayAction = Boolean(isOnlinePlay && primaryActionLabel && showMobileHands);
  const showCompactCurrentHand = Boolean(showMobileHands);

  return (
    <div className="mobile-ultra-compact-shell flex h-full min-h-0 w-full self-stretch flex-col overflow-hidden">
      <div className="mx-auto flex h-full w-full max-w-[1450px] min-h-0 flex-1 flex-col gap-2 md:gap-4">
        <GameHeader
          onBack={onBack}
          copyCode={copyCode}
          onCopyCode={onCopyCode}
          socketStatus={socketStatus}
          copyNotice={copyNotice}
          isOnlinePlay={isOnlinePlay}
        />

        <div className="flex min-h-0 flex-1 flex-col items-stretch gap-2 overflow-hidden pb-2 md:flex-row md:items-center md:justify-center md:gap-6 md:pb-4">
          {showMobileHands && (
            <div className="mobile-opponent-hand w-full flex-shrink-0 self-stretch md:hidden">
              <HandDisplay
                layout="tray"
                title={`${mobileTopHandLabel}'s Hand`}
                pieces={mobileTopHandPieces}
                player={mobileOpponentPlayer}
                isActive={mobileTopHandIsActive}
                statusLabel={mobileTopHandStatus?.label}
                statusToneClassName={mobileTopHandStatus?.toneClassName}
                compact={compactMobileEndgame}
                selectedPiece={selectedPiece}
                onPieceClick={onHandPieceClick}
              />
            </div>
          )}
          {showMobileHands && (
            <div className="mobile-opponent-summary w-full flex-shrink-0 self-stretch md:hidden">
              <HandDisplay
                layout="summary"
                title={`${mobileTopHandLabel}'s Hand`}
                pieces={mobileTopHandPieces}
                player={mobileOpponentPlayer}
                isActive={mobileTopHandIsActive}
                statusLabel={mobileTopHandStatus?.label}
                statusToneClassName={mobileTopHandStatus?.toneClassName}
                selectedPiece={selectedPiece}
                onPieceClick={onHandPieceClick}
              />
            </div>
          )}

          <div className="hidden w-full flex-none md:block md:w-[260px] lg:w-[290px]">
            <HandDisplay
              title={`${blackLabel}'s Hand`}
              pieces={blackHand}
              player="black"
              isActive={currentTurn === 'black' && !winner}
              selectedPiece={selectedPiece}
              onPieceClick={onHandPieceClick}
            />
          </div>

          <div className={`z-10 flex min-h-0 w-full flex-1 self-stretch flex-col justify-center ${boardShellClassName}`}>
            <div className="mobile-ultra-compact-status mb-1.5 flex w-full justify-center sm:mb-2">
              <div
                className={`w-full rounded-full font-black uppercase text-center leading-tight shadow-xl transition-all duration-500 ${
                  winner
                    ? 'bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-500 px-4 py-2 text-[14px] tracking-[0.08em] text-slate-950 shadow-[0_0_35px_rgba(251,191,36,0.9)] sm:px-5 sm:py-3 sm:text-xl md:text-2xl'
                    : currentTurn === 'white'
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2 text-[13px] tracking-[0.12em] text-white shadow-blue-500/40 sm:px-5 sm:py-2.5 sm:text-[16px] md:text-lg md:tracking-[0.2em]'
                      : 'bg-gradient-to-r from-gray-700 to-gray-900 px-4 py-2 text-[13px] tracking-[0.12em] text-white shadow-gray-900/50 sm:px-5 sm:py-2.5 sm:text-[16px] md:text-lg md:tracking-[0.2em]'
                }`}
              >
                {topStatus}
              </div>
            </div>

            <BoardGrid
              board={board}
              selectedPiece={selectedPiece}
              onSquareClick={onSquareClick}
              getPawnDirection={getPawnDirection}
            />
          </div>

          {showMobileHands && (
            <div
              className={`mobile-current-hand relative w-full flex-shrink-0 self-stretch md:hidden ${
                showTinyScreenOverlayAction ? 'mobile-current-hand-with-overlay' : ''
              } ${showCompactOnlineOverlayAction ? 'mobile-online-compact-hand-with-overlay' : ''} ${
                showTinyScreenOverlayAction && showCompactCurrentHand ? 'mobile-current-hand-compact-with-overlay' : ''
              }`}
            >
              {!primaryActionLabel && !isOnlinePlay && (
                <div className="mobile-very-short-bottom-status md:hidden">
                  <BottomStatusBar
                    notice={bottomNotice}
                    primaryActionLabel={primaryActionLabel}
                    onPrimaryAction={onPrimaryAction}
                    primaryActionDisabled={primaryActionDisabled}
                    rematchState={showRematchReadiness ? rematchState : null}
                    compactMobile={Boolean(winner)}
                    ultraCompactMobile
                  />
                </div>
              )}
              <div className="mobile-current-hand-tray">
                <HandDisplay
                  layout="tray"
                  title={`${mobileBottomHandLabel}'s Hand`}
                  pieces={mobileBottomHandPieces}
                  player={mobileHandPlayer}
                  isActive={mobileBottomHandIsActive}
                  statusLabel={mobileBottomHandStatus?.label}
                  statusToneClassName={mobileBottomHandStatus?.toneClassName}
                  compact={compactMobileEndgame}
                  ultraCompact
                  selectedPiece={selectedPiece}
                  onPieceClick={onHandPieceClick}
                />
              </div>
              <div className="mobile-current-hand-summary">
                <HandDisplay
                  layout="summary"
                  title={`${mobileBottomHandLabel}'s Hand`}
                  pieces={mobileBottomHandPieces}
                  player={mobileHandPlayer}
                  isActive={mobileBottomHandIsActive}
                  statusLabel={mobileBottomHandStatus?.label}
                  statusToneClassName={mobileBottomHandStatus?.toneClassName}
                  selectedPiece={selectedPiece}
                  onPieceClick={onHandPieceClick}
                  interactiveSummary
                />
              </div>
              {showTinyScreenOverlayAction && onPrimaryAction && (
                <div className={`mobile-hand-overlay-action md:hidden ${showCompactOnlineOverlayAction ? 'mobile-online-compact-overlay-action' : ''}`}>
                  <BottomActionButton
                    label={primaryActionLabel}
                    onClick={onPrimaryAction}
                    disabled={primaryActionDisabled}
                  />
                </div>
              )}
            </div>
          )}

          <div className="hidden w-full flex-none md:block md:w-[260px] lg:w-[290px]">
            <HandDisplay
              title={`${whiteLabel}'s Hand`}
              pieces={whiteHand}
              player="white"
              isActive={currentTurn === 'white' && !winner}
              selectedPiece={selectedPiece}
              onPieceClick={onHandPieceClick}
            />
          </div>
        </div>

        <BottomStatusBar
          className={`mobile-standard-bottom-status ${isOnlinePlay ? 'mobile-online-compact-bottom-status' : ''}`}
          notice={bottomNotice}
          primaryActionLabel={primaryActionLabel}
          onPrimaryAction={onPrimaryAction}
          primaryActionDisabled={primaryActionDisabled}
          rematchState={showRematchReadiness ? rematchState : null}
          compactMobile={Boolean(winner)}
          ultraCompactMobile
        />
      </div>
    </div>
  );
}

function BottomActionButton({ label, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-full border-2 border-green-300/20 bg-gradient-to-r from-green-600 to-emerald-700 px-4 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-white shadow-[0_10px_30px_rgba(22,163,74,0.24)] transition-all duration-300 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {label}
    </button>
  );
}

export function buildOnlinePlayerStatusLabels(snapshot) {
  return {
    white: getOnlineConnectionStatusInfo(snapshot.players.white),
    black: getOnlineConnectionStatusInfo(snapshot.players.black),
  };
}
