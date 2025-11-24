import React from 'react';
import { Piece } from '../types';

interface NextPieceProps {
  piece: Piece | null;
}

const NextPiece: React.FC<NextPieceProps> = ({ piece }) => {
  if (!piece) return <div className="w-full h-12"></div>;

  return (
    <div className="flex flex-col items-center">
      <div className="w-full aspect-square flex items-center justify-center">
        <div 
          style={{
            display: 'grid',
            gridTemplateRows: `repeat(${piece.shape.length}, 1fr)`,
            gridTemplateColumns: `repeat(${piece.shape[0].length}, 1fr)`,
            gap: '2px'
          }}
        >
          {piece.shape.map((row, y) => (
            row.map((cell, x) => (
              <div
                key={`${x}-${y}`}
                className={`w-2 h-2 sm:w-3 sm:h-3 rounded-[1px]`}
                style={{
                  backgroundColor: cell ? piece.color : 'transparent',
                  boxShadow: cell ? `0 0 4px ${piece.color}` : 'none'
                }}
              />
            ))
          ))}
        </div>
      </div>
    </div>
  );
};

export default NextPiece;