import { useState } from 'react';
import ChessPiece from './components/ChessPiece';
import { isValidMove } from '../../server/gameUtils'; // Add import for validation

function App() {
  // Initial game state
  const [board, setBoard] = useState(Array(16).fill(null)); // 4x4 board = 16 squares
  const [currentTurn, setCurrentTurn] = useState('white'); // 'white' or 'black'
  const [selectedPiece, setSelectedPiece] = useState(null); // { type, player, from } or null
  const [winner, setWinner] = useState(null);
  
  // Initial hands for each player
  const [whiteHand, setWhiteHand] = useState(['rook', 'knight', 'bishop', 'pawn']);
  const [blackHand, setBlackHand] = useState(['rook', 'knight', 'bishop', 'pawn']);

  // Handle clicking on a square on the board
  const handleSquareClick = (index) => {
    if (winner) return; // Game is over

    const piece = board[index];

    if (selectedPiece) {
      // A piece is selected, try to place or move it
      
      if (selectedPiece.from === null) {
        // ==== PLACING A PIECE FROM HAND ====
        if (piece === null) {
          // Empty square - place the piece
          const newBoard = [...board];
          newBoard[index] = { type: selectedPiece.type, player: selectedPiece.player };
          setBoard(newBoard);

          // Remove from hand
          if (selectedPiece.player === 'white') {
            setWhiteHand(whiteHand.filter((p, i) => i !== whiteHand.indexOf(selectedPiece.type)));
          } else {
            setBlackHand(blackHand.filter((p, i) => i !== blackHand.indexOf(selectedPiece.type)));
          }

          setSelectedPiece(null);
          setCurrentTurn(currentTurn === 'white' ? 'black' : 'white');
          checkForWinner(newBoard);
        } else {
          // Square occupied - deselect and show feedback
          setSelectedPiece(null);
        }
      } else {
        // ==== MOVING A PIECE ON THE BOARD ====
        
        // Check if clicking the same piece (deselect)
        if (selectedPiece.from === index) {
          setSelectedPiece(null);
          return;
        }

        // Check if clicking your own piece (reselect)
        if (piece && piece.player === selectedPiece.player) {
          setSelectedPiece({ type: piece.type, player: piece.player, from: index });
          return;
        }

        // --- VALIDATE MOVE BEFORE PROCEEDING ---
        const movePiece = board[selectedPiece.from];
        if (!isValidMove(movePiece, selectedPiece.from, index, board)) {
          // Invalid move - maybe show a visual cue, then deselect
          setSelectedPiece(null);
          return;
        }

        const newBoard = [...board];
        
        // Handle capture - return opponent's piece to their hand
        if (piece && piece.player !== selectedPiece.player) {
          if (piece.player === 'white') {
            setWhiteHand([...whiteHand, piece.type]);
          } else {
            setBlackHand([...blackHand, piece.type]);
          }
        }

        // Move the piece
        newBoard[selectedPiece.from] = null;
        
        let movedPiece = { type: selectedPiece.type, player: selectedPiece.player };

        // Handle Pawn Direction Updates
        if (selectedPiece.type === 'pawn') {
          let direction = movePiece.direction;
          if (direction === undefined) {
             direction = selectedPiece.player === 'white' ? -1 : 1;
          }
          
          const fromRow = Math.floor(selectedPiece.from / 4);
          if ((fromRow === 0 && direction === -1) || (fromRow === 3 && direction === 1)) {
            direction *= -1;
          }
          movedPiece.direction = direction;
        }

        newBoard[index] = movedPiece;
        setBoard(newBoard);
        setSelectedPiece(null);
        setCurrentTurn(currentTurn === 'white' ? 'black' : 'white');
        checkForWinner(newBoard);
      }
    } else {
      // ==== NO PIECE SELECTED ====
      // Try to select a piece on the board
      if (piece && piece.player === currentTurn) {
        setSelectedPiece({ type: piece.type, player: piece.player, from: index });
      }
    }
  };

  // Handle clicking a piece in the hand
  const handleHandPieceClick = (type, player) => {
    if (winner) return;
    if (player !== currentTurn) return;

    if (selectedPiece?.type === type && selectedPiece?.from === null) {
      setSelectedPiece(null); // Deselect
    } else {
      setSelectedPiece({ type, player, from: null });
    }
  };

  // Check for winner (4-in-a-row)
  const checkForWinner = (currentBoard) => {
    const lines = [
      // Horizontal
      [0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11], [12, 13, 14, 15],
      // Vertical
      [0, 4, 8, 12], [1, 5, 9, 13], [2, 6, 10, 14], [3, 7, 11, 15],
      // Diagonal
      [0, 5, 10, 15], [3, 6, 9, 12]
    ];

    for (const line of lines) {
      const [a, b, c, d] = line;
      if (currentBoard[a] && currentBoard[b] && currentBoard[c] && currentBoard[d]) {
        if (
          currentBoard[a].player === currentBoard[b].player &&
          currentBoard[a].player === currentBoard[c].player &&
          currentBoard[a].player === currentBoard[d].player
        ) {
          setWinner(currentBoard[a].player);
          return;
        }
      }
    }
  };

  // Reset game
  const resetGame = () => {
    setBoard(Array(16).fill(null));
    setCurrentTurn('white');
    setSelectedPiece(null);
    setWinner(null);
    setWhiteHand(['rook', 'knight', 'bishop', 'pawn']);
    setBlackHand(['rook', 'knight', 'bishop', 'pawn']);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col items-center justify-center p-4 m-0 absolute inset-0 overflow-hidden">
      {/* Title */}
      <h1 className="text-6xl md:text-8xl font-black mb-4 md:mb-8 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 drop-shadow-lg">
        TIC TAC CHEC
      </h1>

      {/* Turn Indicator */}
      <div className="mb-8 md:mb-12">
        <div className={`px-10 py-4 rounded-full font-black text-2xl tracking-widest uppercase shadow-2xl ${
          currentTurn === 'white' 
            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-blue-500/50' 
            : 'bg-gradient-to-r from-gray-700 to-gray-900 text-white shadow-gray-900/50'
        } transition-all duration-500 ${currentTurn === 'white' ? 'animate-pulse' : ''}`}>
          {winner ? `🏆 ${winner} WINS! 🏆` : `${currentTurn}'S TURN`}
        </div>
      </div>

      {/* Main Game Layout - Centered and Fullscreen */}
      <div className="flex flex-col md:flex-row gap-6 md:gap-16 items-center justify-center w-full max-w-[1400px] flex-1 pb-10">
        
        {/* Black Hand (Left) */}
        <div className="flex-1 w-full max-w-[200px] md:max-w-[300px]">
          <SidePanel 
            title="BLACK'S HAND"
            pieces={blackHand}
            player="black"
            isActive={currentTurn === 'black'}
            selectedPiece={selectedPiece}
            onPieceClick={handleHandPieceClick}
          />
        </div>

        {/* Game Board */}
        <div className="flex-shrink-0 z-10">
          <div className="grid grid-cols-4 gap-0 bg-blue-950 p-6 rounded-3xl shadow-[0_0_80px_rgba(0,0,0,0.8)] border-8 border-slate-700/50 relative overflow-hidden backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none mix-blend-overlay"></div>
            {board.map((piece, index) => {
              const row = Math.floor(index / 4);
              const col = index % 4;
              const isLight = (row + col) % 2 === 0;
              const isSelected = selectedPiece?.from === index;

              return (
                <div
                  key={index}
                  onClick={() => handleSquareClick(index)}
                  className={`
                    w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 flex items-center justify-center cursor-pointer
                    transition-all duration-300 relative
                    ${isLight ? 'bg-slate-300' : 'bg-slate-600'}
                    ${isSelected ? 'ring-[6px] ring-yellow-400 ring-inset scale-[0.92] shadow-inner z-20 rounded-md' : 'rounded-sm'}
                    hover:brightness-125 hover:scale-[0.95] hover:z-10
                  `}
                >
                  {piece && (
                    <div className={`${isSelected ? 'scale-110' : 'scale-100'} transition-transform duration-300`}>
                      <ChessPiece type={piece.type} player={piece.player} />
                    </div>
                  )}
                  <span className="absolute bottom-1 right-2 text-[10px] text-black/40 font-mono select-none font-bold">
                    {index}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* White Hand (Right) */}
        <div className="flex-1 w-full max-w-[200px] md:max-w-[300px]">
          <SidePanel 
            title="WHITE'S HAND"
            pieces={whiteHand}
            player="white"
            isActive={currentTurn === 'white'}
            selectedPiece={selectedPiece}
            onPieceClick={handleHandPieceClick}
          />
        </div>
      </div>

      {/* Reset Button */}
      <button
        onClick={resetGame}
        className="absolute bottom-8 px-12 py-5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 
                   rounded-full font-black text-xl text-white shadow-[0_10px_30px_rgba(220,38,38,0.4)] transition-all duration-300 
                   hover:scale-110 active:scale-95 z-20 uppercase tracking-widest border-2 border-red-400/30"
      >
        🔄 Reset Game
      </button>

      {/* Winner Modal */}
      {winner && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center backdrop-blur-sm z-50 animate-fade-in">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-12 rounded-3xl text-center 
                          border-4 border-yellow-500 shadow-2xl transform scale-100 animate-bounce-in">
            <h2 className="text-6xl font-black mb-6 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
              {winner.toUpperCase()} WINS!
            </h2>
            <div className="text-8xl mb-8">🏆</div>
            <button 
              onClick={resetGame}
              className="px-10 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 
                         rounded-full font-bold text-xl transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Side Panel Component for Player's Hand
function SidePanel({ title, pieces, player, isActive, selectedPiece, onPieceClick }) {
  return (
    <div className={`
      bg-gradient-to-br ${player === 'white' ? 'from-indigo-900 to-blue-950' : 'from-slate-800 to-gray-900'}
      p-6 rounded-2xl shadow-xl border-2 
      ${isActive ? 'border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.3)]' : 'border-gray-700/50'}
      transition-all duration-500 w-full min-h-[400px] flex flex-col justify-start
    `}>
      <h2 className="text-sm font-black uppercase tracking-[0.2em] mb-6 text-center text-gray-200 drop-shadow-md">
        {title}
      </h2>
      <div className="flex flex-col gap-4 flex-1 justify-center">
        {pieces.map((type, index) => {
          const isSelected = selectedPiece?.type === type && 
                            selectedPiece?.player === player && 
                            selectedPiece?.from === null;
          
          return (
            <div
              key={`${type}-${index}`}
              onClick={() => onPieceClick(type, player)}
              className={`
                cursor-pointer transition-all duration-300 p-4 rounded-xl flex flex-col items-center
                ${isSelected ? 'ring-4 ring-yellow-400 scale-105 bg-yellow-400/20 shadow-lg' : 'hover:bg-white/10 hover:shadow-md hover:scale-[1.02]'}
                ${!isActive ? 'opacity-50 cursor-not-allowed grayscale-[0.5]' : ''}
              `}
            >
              <div className="drop-shadow-lg scale-125 mb-1">
                <ChessPiece type={type} player={player} />
              </div>
              <p className="text-xs tracking-wider text-center mt-3 uppercase font-bold text-gray-300 drop-shadow-sm">
                {type}
              </p>
            </div>
          );
        })}
      </div>
      {pieces.length === 0 && (
        <p className="text-center text-gray-500 text-sm italic py-4">
          No pieces left
        </p>
      )}
    </div>
  );
}

export default App;
