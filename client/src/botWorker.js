import { chooseBotMove } from '@shared/botEngine.js';

let cachedOpeningBook = null;

async function getOpeningBook(difficulty) {
  if (difficulty !== 'hard') {
    return null;
  }

  if (cachedOpeningBook) {
    return cachedOpeningBook;
  }

  const module = await import('@shared/openingBook.js');
  cachedOpeningBook = module.default;
  return cachedOpeningBook;
}

self.addEventListener('message', async (event) => {
  const { requestId, gameState, player, difficulty } = event.data || {};

  try {
    const openingBook = await getOpeningBook(difficulty);
    const move = chooseBotMove({
      gameState,
      player,
      difficulty,
      openingBook,
    });

    self.postMessage({
      requestId,
      move,
    });
  } catch (error) {
    self.postMessage({
      requestId,
      error: error instanceof Error ? error.message : 'Bot analysis failed.',
    });
  }
});
