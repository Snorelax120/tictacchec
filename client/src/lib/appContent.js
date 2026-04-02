export const RULE_SECTIONS = [
  {
    title: 'What Is Tic Tac Chec?',
    body:
      'Tic Tac Chec blends a 4x4 tic-tac-toe win condition with chess-style movement. You are not trying to checkmate. You are trying to build a line of four pieces in your color.',
  },
  {
    title: 'How A Turn Works',
    body:
      'White starts. On your turn, either place one piece from your hand on an empty square or move one of your pieces already on the board using its chess movement.',
  },
  {
    title: 'Winning The Game',
    body:
      'Make a full row, column, or diagonal of four pieces in your color anywhere on the 4x4 board. The first player to complete a line wins immediately.',
  },
];

export const ONLINE_DEFAULTS = {
  createName: '',
  createColorChoice: 'white',
  joinName: '',
  joinCode: '',
};

export const BOT_DEFAULTS = {
  difficulty: 'medium',
  seatChoice: 'white',
};

export const BOT_DIFFICULTY_LABELS = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

export const COLOR_CHOICE_OPTIONS = [
  { value: 'white', label: 'Start As White', detail: 'You get White and move first.' },
  { value: 'black', label: 'Start As Black', detail: 'You get Black and your opponent moves first.' },
  { value: 'random', label: 'Random Seat', detail: 'The server decides White and Black when player two joins.' },
];

export const BOT_DIFFICULTY_OPTIONS = [
  {
    value: 'easy',
    label: 'Easy',
    detail: 'Takes wins and basic blocks, but still leaves openings and makes softer choices.',
  },
  {
    value: 'medium',
    label: 'Medium',
    detail: 'Searches deeper, spots immediate tactics, and plays a steadier positional game.',
  },
  {
    value: 'hard',
    label: 'Hard',
    detail: 'Uses the opening book when available, then the strongest practical search in the browser.',
  },
];

export const BOT_SEAT_OPTIONS = [
  { value: 'white', label: 'Play As White', compactLabel: 'White', detail: 'You move first and the bot answers as Black.' },
  { value: 'black', label: 'Play As Black', compactLabel: 'Black', detail: 'The bot opens as White and you react from move one.' },
  { value: 'random', label: 'Random Seat', compactLabel: 'Random', detail: 'The app randomly assigns White and Black for this match.' },
];
