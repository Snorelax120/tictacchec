import CenterCard from '../ui/CenterCard.jsx';
import ActionButton from '../ui/ActionButton.jsx';
import InlineNotice from '../ui/InlineNotice.jsx';
import TextInput from '../ui/TextInput.jsx';
import { ColorChoicePicker } from '../ui/ChoicePickers.jsx';

export default function OnlineCreateScreen({ values, isSubmitting, flashMessage, onChange, onSubmit, onBack }) {
  return (
    <CenterCard
      title="Create Lobby"
      description="Your name is required, and your seat preference decides whether you start as white, black, or let the server randomize it."
      onBack={onBack}
      hideEyebrow
      compactMobileHeader
      desktopCenteredHeader
    >
      <form className="compact-height-scroll mt-5 flex h-full min-h-0 flex-col gap-4" onSubmit={onSubmit}>
        <TextInput
          label="Your Name"
          value={values.createName}
          onChange={(event) => onChange('createName', event.target.value)}
          placeholder="Player 1"
          autoFocus
        />
        <ColorChoicePicker
          value={values.createColorChoice}
          onChange={(value) => onChange('createColorChoice', value)}
        />
        {flashMessage && <InlineNotice message={flashMessage} />}
        <div className="mt-auto flex flex-col gap-3 sm:flex-row sm:justify-between">
          <ActionButton onClick={onBack} tone="slate" type="button" className="w-full sm:w-auto">
            Cancel
          </ActionButton>
          <ActionButton tone="cyan" type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting ? 'Creating...' : 'Generate Lobby Code'}
          </ActionButton>
        </div>
      </form>
    </CenterCard>
  );
}
