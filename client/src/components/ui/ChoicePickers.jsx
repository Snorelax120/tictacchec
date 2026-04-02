import { BOT_DIFFICULTY_OPTIONS, BOT_SEAT_OPTIONS, COLOR_CHOICE_OPTIONS } from '../../lib/appContent.js';

export function ColorChoicePicker({ value, onChange }) {
  return (
    <SelectionCardGroup
      title="Color Preference"
      options={COLOR_CHOICE_OPTIONS}
      value={value}
      onChange={onChange}
    />
  );
}

export function BotDifficultyPicker({ value, onChange }) {
  return (
    <ResponsiveOptionGroup
      title="Difficulty"
      options={BOT_DIFFICULTY_OPTIONS}
      value={value}
      onChange={onChange}
    />
  );
}

export function BotSeatPicker({ value, onChange }) {
  return (
    <ResponsiveOptionGroup
      title="Your Seat"
      options={BOT_SEAT_OPTIONS}
      value={value}
      onChange={onChange}
      compactLabelKey="compactLabel"
    />
  );
}

function SelectionCardGroup({ title, options, value, onChange }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300/90">
        {title}
      </p>
      <div className="mt-2.5 grid gap-2.5 sm:mt-3 sm:gap-3">
        {options.map((option) => {
          const active = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`rounded-2xl border px-4 py-3 text-left transition sm:px-5 sm:py-4 ${
                active
                  ? 'border-cyan-300/50 bg-cyan-400/10 shadow-[0_0_30px_rgba(34,211,238,0.12)]'
                  : 'border-white/10 bg-slate-950/80 hover:border-white/25 hover:bg-white/5'
              }`}
            >
              <span className="block text-base font-black text-white">
                {option.label}
              </span>
              <span className="mt-1 block text-sm leading-5 text-slate-300/80 sm:leading-6">
                {option.detail}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ResponsiveOptionGroup({ title, options, value, onChange, compactLabelKey = 'label' }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300/90">
        {title}
      </p>
      <div className="mt-2.5 grid grid-cols-3 gap-2 min-[900px]:hidden">
        {options.map((option) => {
          const active = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`min-w-0 rounded-2xl border px-2 py-3 text-center text-sm font-black uppercase tracking-[0.08em] transition ${
                active
                  ? 'border-cyan-300/50 bg-cyan-400/10 text-white shadow-[0_0_24px_rgba(34,211,238,0.12)]'
                  : 'border-white/10 bg-slate-950/80 text-slate-300 hover:border-white/25 hover:bg-white/5'
              }`}
            >
              {option[compactLabelKey]}
            </button>
          );
        })}
      </div>
      <div className="mt-2.5 hidden min-[900px]:grid min-[900px]:gap-3">
        {options.map((option) => {
          const active = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`rounded-2xl border px-4 py-3 text-left transition sm:px-5 sm:py-4 ${
                active
                  ? 'border-cyan-300/50 bg-cyan-400/10 shadow-[0_0_30px_rgba(34,211,238,0.12)]'
                  : 'border-white/10 bg-slate-950/80 hover:border-white/25 hover:bg-white/5'
              }`}
            >
              <span className="block text-base font-black text-white">
                {option.label}
              </span>
              <span className="mt-1 block text-sm leading-5 text-slate-300/80 sm:leading-6">
                {option.detail}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
