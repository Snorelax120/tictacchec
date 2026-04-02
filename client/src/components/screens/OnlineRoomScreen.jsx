import GameScreen, { buildOnlinePlayerStatusLabels } from '../gameplay/GameScreen.jsx';
import CenterCard from '../ui/CenterCard.jsx';
import InfoCard from '../ui/InfoCard.jsx';
import InlineNotice from '../ui/InlineNotice.jsx';
import LobbyCodeCard from '../ui/LobbyCodeCard.jsx';
import { buildWaitingSummary, getOnlinePlayerLabel, getOnlineStatusMessage } from '../../lib/gameUi.js';

export default function OnlineRoomScreen({
  snapshot,
  selectedPiece,
  onSquareClick,
  onHandPieceClick,
  onBack,
  onRematch,
  onCopyCode,
  copyNotice,
  socketStatus,
  flashMessage,
  getPawnDirection,
}) {
  const waitingSummary = buildWaitingSummary(snapshot);

  if (!snapshot || snapshot.phase === 'waiting') {
    return (
      <CenterCard
        title="Lobby Ready"
        description="Share the join code with player two. This room will stay attached to the same durable lobby instance."
        onBack={onBack}
        hideEyebrow
        compactMobileHeader
      >
        <div className="mt-5 flex h-full min-h-0 flex-col gap-3">
          <LobbyCodeCard
            code={snapshot?.lobbyCode || '......'}
            onCopy={onCopyCode}
            copyNotice={copyNotice}
            socketStatus={socketStatus}
          />
          <div className="grid gap-3 lg:grid-cols-2">
            <InfoCard title="Seat Preference" value={waitingSummary.title} detail={waitingSummary.detail} />
            <InfoCard
              title="Players"
              value={snapshot?.players?.host?.name || 'Connecting...'}
              detail={snapshot?.players?.guest
                ? `${snapshot.players.guest.name} joined and the match should start any second.`
                : 'Opponent slot is still open.'}
            />
          </div>
          {flashMessage && <InlineNotice message={flashMessage} />}
        </div>
      </CenterCard>
    );
  }

  const canRequestRematch =
    snapshot.phase === 'finished' &&
    snapshot.closedReason !== 'disconnect_timeout' &&
    snapshot.players.white &&
    snapshot.players.black;
  const yourRematchReady = snapshot.yourSeat
    ? snapshot.rematch?.[snapshot.yourSeat === 'white' ? 'whiteReady' : 'blackReady']
    : false;

  return (
    <GameScreen
      board={snapshot.game.board}
      currentTurn={snapshot.game.turn}
      selectedPiece={selectedPiece}
      winner={snapshot.game.winner}
      blackHand={snapshot.game.hands.black}
      whiteHand={snapshot.game.hands.white}
      blackLabel={getOnlinePlayerLabel(snapshot, 'black')}
      whiteLabel={getOnlinePlayerLabel(snapshot, 'white')}
      topStatus={getOnlineStatusMessage(snapshot)}
      onSquareClick={onSquareClick}
      onHandPieceClick={onHandPieceClick}
      onBack={onBack}
      onPrimaryAction={canRequestRematch ? onRematch : null}
      primaryActionLabel={canRequestRematch
        ? yourRematchReady
          ? 'Rematch Requested'
          : 'Request Rematch'
        : null}
      primaryActionDisabled={!canRequestRematch || yourRematchReady}
      getPawnDirection={getPawnDirection}
      socketStatus={socketStatus}
      copyCode={snapshot.lobbyCode}
      onCopyCode={onCopyCode}
      copyNotice={copyNotice}
      bottomNotice={flashMessage}
      rematchState={snapshot.rematch}
      mobileHandPlayer={snapshot.yourSeat || null}
      playerStatusLabels={buildOnlinePlayerStatusLabels(snapshot)}
      isOnlinePlay
    />
  );
}
