import React from 'react';
import ChessPiece from './ChessPiece';

const GameBoard = ({ board, onSquareClick, selectedPiece, validMoves = [] }) => {
  return (
    <div className="grid grid-cols-4 gap-0 bg-amber-900 p-4 rounded-2xl shadow-2xl border-4 border-amber-700">
      {board.map((piece, index) => {
        const row = Math.floor(index / 4);
        const col = index % 4;
        const isLight = (row + col) % 2 === 0;
        const isSelected = selectedPiece?.from === index;
        const isValidTarget = validMoves.includes(index);

        return (
          <div
            key={index}
            onClick={() => onSquareClick(index)}
            className={`
              w-32 h-32 flex items-center justify-center cursor-pointer
              transition-all duration-200 relative
              ${isLight ? 'bg-amber-200' : 'bg-amber-800'}
              ${isSelected ? 'ring-4 ring-yellow-400 ring-inset scale-95' : ''}
              ${isValidTarget ? 'ring-2 ring-green-400' : ''}
              hover:brightness-110 hover:scale-95
            `}
          >
            {piece && (
              <div className={isSelected ? 'scale-110' : ''}>
                <ChessPiece type={piece.type} player={piece.player} />
              </div>
            )}
            <span className="absolute bottom-1 right-2 text-xs text-black/20 font-mono select-none">
              {index}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default GameBoard;
