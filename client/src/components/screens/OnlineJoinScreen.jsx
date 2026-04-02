import CenterCard from '../ui/CenterCard.jsx';
import ActionButton from '../ui/ActionButton.jsx';
import InlineNotice from '../ui/InlineNotice.jsx';
import TextInput from '../ui/TextInput.jsx';

export default function OnlineJoinScreen({ values, isSubmitting, flashMessage, onChange, onSubmit, onBack }) {
  return (
    <CenterCard
      title="Join Lobby"
      description="Add your name, paste the six-character lobby code, and connect as player two."
      onBack={onBack}
      hideEyebrow
      compactMobileHeader
      desktopCenteredHeader
    >
      <form className="mt-5 flex h-full min-h-0 flex-col gap-4" onSubmit={onSubmit}>
        <TextInput
          label="Your Name"
          value={values.joinName}
          onChange={(event) => onChange('joinName', event.target.value)}
          placeholder="Player 2"
          autoFocus
        />
        <TextInput
          label="Lobby Code"
          value={values.joinCode}
          onChange={(event) => onChange('joinCode', event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
          placeholder="ABC123"
          className="tracking-[0.45em] uppercase"
        />
        {flashMessage && <InlineNotice message={flashMessage} />}
        <div className="mt-auto flex flex-col gap-3 sm:flex-row sm:justify-between">
          <ActionButton onClick={onBack} tone="slate" type="button" className="w-full sm:w-auto">
            Cancel
          </ActionButton>
          <ActionButton tone="cyan" type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting ? 'Joining...' : 'Join Game'}
          </ActionButton>
        </div>
      </form>
    </CenterCard>
  );
}
