import MenuButton from '../ui/MenuButton.jsx';

export default function MenuScreen({
  onPlayOverBoard,
  onPlayBot,
  onOpenRules,
  onPlayOnline,
  hasActiveSession,
  onResumeOnline,
}) {
  return (
    <div className="menu-screen-shell flex h-full min-h-0 w-full items-center justify-center">
      <div className="menu-screen-frame mx-auto flex h-full min-h-0 w-full max-w-[900px]">
        <section className="menu-screen-card relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-slate-900/70 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.65)] backdrop-blur-xl sm:p-8 lg:p-10">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-transparent to-blue-500/10 pointer-events-none" />
          <div className="menu-screen-content relative flex min-h-0 flex-1 flex-col justify-between gap-4 py-1 sm:gap-6 sm:py-0">
            <div className="mx-auto w-full max-w-2xl flex-shrink text-center">
              <h1 className="text-center text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-600 drop-shadow-lg sm:text-7xl lg:text-8xl">
                TIC TAC CHEC
              </h1>
              <p className="mt-3 text-[9px] font-black uppercase tracking-[0.28em] text-cyan-300/90 sm:text-xs sm:tracking-[0.45em]">
                Chess Movement. Tic-Tac Pressure.
              </p>
              <p className="mt-3 text-sm leading-5 text-slate-300/80 sm:text-base sm:leading-7">
                Drop pieces from your hand, maneuver for control, and now create a live code-based lobby for online play.
              </p>
            </div>

            <div className="mx-auto flex w-full max-w-2xl min-h-0 flex-1 flex-col justify-end gap-2 sm:gap-3">
              <MenuButton
                title="Play Over the Board"
                description="Start a local two-player match with the full gameboard experience."
                tone="cyan"
                onClick={onPlayOverBoard}
              />
              <MenuButton
                title="Play vs Bot"
                description="Pick a difficulty, choose your color, and play a browser-side bot with no server wait."
                tone="teal"
                onClick={onPlayBot}
              />
              <MenuButton
                title="Play Online"
                description="Create a code-based lobby, share it, and play a live game backed by Cloudflare Durable Objects."
                tone="blue"
                onClick={onPlayOnline}
              />
              {hasActiveSession && (
                <MenuButton
                  title="Resume Online Lobby"
                  description="Reconnect to the lobby from the last active browser session."
                  tone="teal"
                  onClick={onResumeOnline}
                />
              )}
              <MenuButton
                title="How to Play / Rules"
                description="Learn what Tic Tac Chec is, how turns work, and how each piece helps you win."
                tone="slate"
                onClick={onOpenRules}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
