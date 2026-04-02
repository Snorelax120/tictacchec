import CenterCard from '../ui/CenterCard.jsx';
import ActionButton from '../ui/ActionButton.jsx';
import { BotDifficultyPicker, BotSeatPicker } from '../ui/ChoicePickers.jsx';

export default function BotSetupScreen({ values, onChange, onSubmit, onBack }) {
  return (
    <CenterCard
      title="Play vs Bot"
      description="Choose a difficulty, decide whether you want White, Black, or random, and let the bot run directly in your browser."
      onBack={onBack}
      hideEyebrow
      compactMobileHeader
      desktopBackLeft
    >
      <form className="mt-5 flex h-full min-h-0 flex-col gap-4" onSubmit={onSubmit}>
        <BotDifficultyPicker
          value={values.difficulty}
          onChange={(value) => onChange('difficulty', value)}
        />
        <BotSeatPicker
          value={values.seatChoice}
          onChange={(value) => onChange('seatChoice', value)}
        />
        <div className="mt-auto flex flex-col gap-3 sm:flex-row sm:justify-between">
          <ActionButton onClick={onBack} tone="slate" type="button" className="w-full sm:w-auto">
            Cancel
          </ActionButton>
          <ActionButton tone="cyan" type="submit" className="w-full sm:w-auto">
            Start Bot Match
          </ActionButton>
        </div>
      </form>
    </CenterCard>
  );
}
