import ChessPiece from '../ChessPiece.jsx';

export default function BoardGrid({
  board,
  selectedPiece,
  onSquareClick,
  getPawnDirection,
}) {
  return (
    <div className="mobile-ultra-compact-board relative grid w-full grid-cols-4 gap-0 overflow-hidden rounded-[1.2rem] border-4 border-slate-700/50 bg-blue-950 p-2.5 shadow-[0_0_80px_rgba(0,0,0,0.8)] backdrop-blur-sm sm:rounded-[1.4rem] sm:border-[5px] sm:p-3 md:rounded-3xl md:border-8 md:p-6">
      <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none mix-blend-overlay" />
      {board.map((piece, index) => {
        const row = Math.floor(index / 4);
        const col = index % 4;
        const isLight = (row + col) % 2 === 0;
        const isSelected = selectedPiece?.from === index;
        const pawnDirection = getPawnDirection(piece, index);

        return (
          <div
            key={index}
            onClick={() => onSquareClick(index)}
            className={`
              relative flex aspect-square w-full cursor-pointer items-center justify-center transition-all duration-300
              ${isLight ? 'bg-slate-300' : 'bg-slate-600'}
              ${isSelected ? 'z-20 scale-[0.92] rounded-md ring-[3px] ring-inset ring-yellow-400 shadow-inner sm:ring-[4px] md:ring-[6px]' : 'rounded-[0.18rem] sm:rounded-[0.2rem] md:rounded-sm'}
              hover:brightness-125 hover:scale-[0.95] hover:z-10
            `}
          >
            {piece && (
              <div className={`mobile-ultra-compact-piece ${isSelected ? 'scale-105 sm:scale-110' : 'scale-[0.88] sm:scale-[0.95] md:scale-100'} transition-transform duration-300`}>
                <ChessPiece
                  type={piece.type}
                  player={piece.player}
                  direction={pawnDirection}
                  iconClassName="text-[2.3rem] sm:text-[2.75rem] md:text-[3.75rem]"
                />
              </div>
            )}
            <span className="mobile-ultra-compact-index absolute bottom-0.5 right-1 text-[8px] font-bold text-black/40 select-none font-mono sm:text-[9px] md:bottom-1 md:right-2 md:text-[10px]">
              {index}
            </span>
          </div>
        );
      })}
    </div>
  );
}
