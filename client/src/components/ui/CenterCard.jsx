import ActionButton from './ActionButton.jsx';

export default function CenterCard({
  title,
  eyebrow,
  description,
  onBack,
  children,
  hideEyebrow = false,
  compactMobileHeader = false,
  contentClassName = '',
  desktopCenteredHeader = false,
  desktopBackLeft = false,
}) {
  const compactHeaderButtonClass = 'h-10 w-full justify-center overflow-hidden rounded-[1rem] px-0 py-0 text-[9px] tracking-[0.04em] !border-slate-600/80 !from-slate-800 !to-slate-950 !shadow-none hover:scale-100 active:scale-100 sm:h-auto sm:px-3 sm:py-2 sm:text-[10px]';

  return (
    <div className="center-card-shell flex h-full min-h-0 w-full items-center justify-center">
      <div className="center-card-frame mx-auto flex h-full min-h-0 w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-slate-900/80 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.65)] backdrop-blur-xl sm:p-8">
        <div className="flex flex-shrink-0 flex-col gap-3">
          {compactMobileHeader ? (
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
              <h1 className="justify-self-center text-center text-[1.95rem] font-black leading-none tracking-tight text-white">
                {title}
              </h1>
              <div className="w-full" />
            </div>
          ) : null}

          {desktopCenteredHeader ? (
            <div className={`hidden md:grid md:grid-cols-[auto_1fr_auto] md:items-start md:gap-4 ${compactMobileHeader ? 'md:grid' : ''}`}>
              <div className="flex justify-start">
                <ActionButton onClick={onBack} tone="slate" className="w-full flex-shrink-0 px-4 py-2 text-xs tracking-[0.08em] sm:w-auto sm:px-5 sm:text-sm">
                  ← Menu
                </ActionButton>
              </div>
              <div className="mx-auto max-w-2xl text-center">
                {!hideEyebrow && eyebrow ? (
                  <p className="text-xs font-black uppercase tracking-[0.35em] text-cyan-300/90">
                    {eyebrow}
                  </p>
                ) : null}
                <h1 className={`${hideEyebrow ? 'mt-0' : 'mt-2 sm:mt-3'} text-[1.65rem] font-black tracking-tight text-white sm:text-5xl`}>
                  {title}
                </h1>
                <p className="mt-3 text-sm leading-5 text-slate-300/85 sm:mt-4 sm:text-base sm:leading-7">
                  {description}
                </p>
              </div>
              <div className="flex justify-end">
                <ActionButton
                  tone="slate"
                  className="invisible w-full flex-shrink-0 px-4 py-2 text-xs tracking-[0.08em] sm:w-auto sm:px-5 sm:text-sm"
                  ariaLabel="Spacer"
                >
                  ← Menu
                </ActionButton>
              </div>
            </div>
          ) : null}

          <div className={`flex flex-col gap-3 sm:gap-4 ${desktopBackLeft ? 'sm:items-start' : 'sm:flex-row sm:items-start sm:justify-between'} ${compactMobileHeader ? 'hidden md:flex' : ''} ${desktopCenteredHeader ? 'md:hidden' : ''}`}>
            {desktopBackLeft ? (
              <div className="flex w-full flex-col gap-4">
                <div className="grid w-full grid-cols-[auto_1fr_auto] items-start gap-4">
                  <ActionButton onClick={onBack} tone="slate" className="w-full flex-shrink-0 px-4 py-2 text-xs tracking-[0.08em] sm:w-auto sm:px-5 sm:text-sm">
                    ← Menu
                  </ActionButton>
                  <div className="text-center">
                    {!hideEyebrow && eyebrow ? (
                      <p className="text-xs font-black uppercase tracking-[0.35em] text-cyan-300/90">
                        {eyebrow}
                      </p>
                    ) : null}
                    <h1 className={`${hideEyebrow ? 'mt-0' : 'mt-2 sm:mt-3'} text-[1.65rem] font-black tracking-tight text-white sm:text-5xl`}>
                      {title}
                    </h1>
                  </div>
                  <div className="flex justify-end">
                    <ActionButton
                      tone="slate"
                      className="invisible w-full flex-shrink-0 px-4 py-2 text-xs tracking-[0.08em] sm:w-auto sm:px-5 sm:text-sm"
                      ariaLabel="Spacer"
                    >
                      ← Menu
                    </ActionButton>
                  </div>
                </div>
                <p className="max-w-2xl text-sm leading-5 text-slate-300/85 sm:text-base sm:leading-7">
                  {description}
                </p>
              </div>
            ) : (
              <>
                <ActionButton onClick={onBack} tone="slate" className="w-full flex-shrink-0 px-4 py-2 text-xs tracking-[0.08em] sm:w-auto sm:px-5 sm:text-sm">
                  ← Menu
                </ActionButton>
                <div>
                  {!hideEyebrow && eyebrow ? (
                    <p className="text-xs font-black uppercase tracking-[0.35em] text-cyan-300/90">
                      {eyebrow}
                    </p>
                  ) : null}
                  <h1 className={`${hideEyebrow ? 'mt-0' : 'mt-2 sm:mt-3'} text-[1.65rem] font-black tracking-tight text-white sm:text-5xl`}>
                    {title}
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-5 text-slate-300/85 sm:mt-4 sm:text-base sm:leading-7">
                    {description}
                  </p>
                </div>
              </>
            )}
          </div>

          {compactMobileHeader ? (
            <p className="text-center text-sm leading-5 text-slate-300/85 md:hidden">
              {description}
            </p>
          ) : null}
        </div>
        <div className={`mt-4 flex min-h-0 flex-1 flex-col overflow-hidden ${contentClassName}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
