import CenterCard from '../ui/CenterCard.jsx';
import MenuButton from '../ui/MenuButton.jsx';

export default function OnlineHubScreen({
  onBack,
  onOpenCreate,
  onOpenJoin,
  flashMessage,
  hasActiveSession,
  onResumeLobby,
}) {
  return (
    <CenterCard
      title="Online Play"
      description="Create a code, share it with your opponent, and let the server run the official state for both players."
      onBack={onBack}
      hideEyebrow
      compactMobileHeader
      desktopCenteredHeader
      contentClassName="justify-end"
    >
      <div className="flex h-full min-h-0 flex-col justify-end">
        <div className="grid gap-2 sm:gap-4">
          <MenuButton
            title="Create Lobby"
            description="Pick your name, choose white, black, or random, and generate a shareable lobby code."
            tone="cyan"
            onClick={onOpenCreate}
          />
          <MenuButton
            title="Join Lobby"
            description="Enter a friend’s lobby code, add your name, and connect straight to the live match."
            tone="blue"
            onClick={onOpenJoin}
          />
          {hasActiveSession && (
            <MenuButton
              title="Resume Saved Lobby"
              description="Reconnect with the saved session token from this browser."
              tone="teal"
              onClick={onResumeLobby}
            />
          )}
        </div>
        {flashMessage && (
          <p className="mt-4 rounded-2xl border border-cyan-400/20 bg-slate-950/70 px-4 py-3 text-sm text-slate-200/85">
            {flashMessage}
          </p>
        )}
      </div>
    </CenterCard>
  );
}
