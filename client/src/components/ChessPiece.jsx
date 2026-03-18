import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
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

const ChessPiece = ({ type, player, className = "" }) => {
  const icon = icons[type];
  if (!icon) return null;

  const colorClass = player === 'white' ? 'text-gray-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]' : 'text-gray-950 drop-shadow-[0_2px_4px_rgba(255,255,255,0.4)]';

  return (
    <div className={`transition-all duration-300 hover:scale-125 cursor-pointer ${className}`}>
      <FontAwesomeIcon 
        icon={icon} 
        className={`${colorClass}`}
        size="4x"
      />
    </div>
  );
};

export default ChessPiece;
