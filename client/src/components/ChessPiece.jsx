import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faArrowDown,
  faArrowUp,
  faChessRook, 
  faChessKnight, 
  faChessBishop, 
  faChessPawn 
} from '@fortawesome/free-solid-svg-icons';

const icons = {
  rook: faChessRook,
  knight: faChessKnight,
  bishop: faChessBishop,
  pawn: faChessPawn,
};

const ChessPiece = ({ type, player, direction, className = '', iconClassName = '' }) => {
  const icon = icons[type];
  if (!icon) return null;

  const colorClass = player === 'white' ? 'text-gray-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]' : 'text-gray-950 drop-shadow-[0_2px_4px_rgba(255,255,255,0.4)]';
  const arrowIcon = direction === -1 ? faArrowUp : direction === 1 ? faArrowDown : null;
  const arrowBadgeClass = player === 'white'
    ? 'bg-slate-950/85 text-cyan-300 border border-white/20 shadow-[0_0_12px_rgba(34,211,238,0.45)]'
    : 'bg-white/90 text-slate-900 border border-slate-900/10 shadow-[0_0_12px_rgba(255,255,255,0.4)]';

  return (
    <div className={`relative inline-flex transition-all duration-300 hover:scale-125 cursor-pointer ${className}`}>
      <FontAwesomeIcon 
        icon={icon} 
        className={`${colorClass} ${iconClassName}`}
      />
      {type === 'pawn' && arrowIcon && (
        <span
          className={`pointer-events-none absolute left-1/2 top-1 -translate-x-1/2 rounded-full px-1.5 py-1 text-[10px] leading-none ${arrowBadgeClass}`}
          aria-hidden="true"
        >
          <FontAwesomeIcon icon={arrowIcon} />
        </span>
      )}
    </div>
  );
};

export default ChessPiece;
