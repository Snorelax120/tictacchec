import { RULE_SECTIONS } from '../../lib/appContent.js';
import ActionButton from '../ui/ActionButton.jsx';

export default function RulesScreen({ onBack }) {
  const compactHeaderButtonClass = 'h-10 w-full justify-center overflow-hidden rounded-[1rem] px-0 py-0 text-[9px] tracking-[0.04em] !border-slate-600/80 !from-slate-800 !to-slate-950 !shadow-none hover:scale-100 active:scale-100 sm:h-auto sm:px-3 sm:py-2 sm:text-[10px]';

  return (
    <div className="flex h-full min-h-0 w-full items-center justify-center">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col rounded-[2rem] border border-cyan-400/20 bg-slate-900/70 px-4 py-4 shadow-[0_24px_80px_rgba(15,23,42,0.65)] backdrop-blur-xl sm:px-6 sm:py-5 lg:px-7 lg:py-6">
        <div className="flex flex-shrink-0 flex-col gap-3">
          <div className="grid grid-cols-[2.7rem_1fr_2.7rem] items-center gap-2 md:hidden">
            <ActionButton
              onClick={onBack}
              tone="slate"
              ariaLabel="Back to menu"
              className={compactHeaderButtonClass}
            >
              <span aria-hidden="true" className="text-base leading-none sm:text-sm">←</span>
              <span className="sr-only sm:not-sr-only sm:ml-1">Menu</span>
            </ActionButton>
            <h1 className="justify-self-center text-center text-[1.95rem] font-black leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 drop-shadow-lg">
              How To Play
            </h1>
            <div className="w-full" />
          </div>
          <div className="hidden md:flex md:justify-start">
            <ActionButton onClick={onBack} tone="slate" className="w-full px-4 py-2 text-xs tracking-[0.08em] sm:w-auto sm:px-5 sm:text-sm">
              ← Menu
            </ActionButton>
          </div>
          <div className="hidden pt-1 text-right sm:-mt-3 md:flex md:justify-end">
            <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 sm:text-6xl lg:text-[4.2rem]">
              How To Play
            </h1>
          </div>
        </div>

        <div className="app-scroll-panel mt-4 flex-1">
          <div className="grid gap-3 pr-1 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="grid gap-4 content-start">
              {RULE_SECTIONS.map((section) => (
                <div
                  key={section.title}
                  className="rounded-[1.35rem] border border-white/10 bg-slate-950/70 p-4 lg:p-5"
                >
                  <h2 className="text-base font-black uppercase tracking-[0.12em] text-white lg:text-xl lg:tracking-[0.14em]">
                    {section.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-300/85 lg:text-[15px]">
                    {section.body}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 content-start">
              <div className="rounded-[1.35rem] border border-white/10 bg-gradient-to-br from-slate-800/90 to-slate-950/90 p-4 lg:p-5">
                <h2 className="text-base font-black uppercase tracking-[0.12em] text-white lg:text-xl lg:tracking-[0.14em]">
                  Piece Movements
                </h2>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300/85 lg:text-[15px]">
                  <li><span className="font-black text-white">Rook:</span> any distance horizontally or vertically.</li>
                  <li><span className="font-black text-white">Bishop:</span> any distance diagonally.</li>
                  <li><span className="font-black text-white">Knight:</span> L-shape jump, two plus one.</li>
                  <li><span className="font-black text-white">Pawn:</span> one step forward, diagonal captures, flips at the edge.</li>
                </ul>
              </div>

              <div className="rounded-[1.35rem] border border-cyan-400/15 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 p-4 lg:p-5">
                <h2 className="text-base font-black uppercase tracking-[0.12em] text-white lg:text-xl lg:tracking-[0.14em]">
                  Key Rules
                </h2>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-200/85 lg:text-[15px]">
                  <li>Players place pieces from hand before moving them later.</li>
                  <li>Captured pieces return to the captured player&apos;s hand.</li>
                  <li>White always moves first.</li>
                  <li>Online rematches swap colors with the same opponent.</li>
                </ul>
              </div>

              <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/60 p-4 lg:p-5">
                <h2 className="text-base font-black uppercase tracking-[0.12em] text-white lg:text-xl lg:tracking-[0.14em]">
                  Winning Mindset
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-300/85 lg:text-[15px]">
                  The goal is not checkmate. Build board pressure, recycle captured pieces, and race to align four of your own color first.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
