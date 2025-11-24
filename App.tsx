import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  BOARD_WIDTH, 
  BOARD_HEIGHT, 
  EMPTY_CELL, 
  TETROMINOS, 
  TETROMINO_KEYS, 
  NEON_COLORS, 
  INITIAL_DROP_SPEED,
  SPEED_INCREMENT,
  MIN_DROP_SPEED
} from './constants';
import { Grid, Piece, Shape } from './types';
import Fireworks, { FireworksHandle } from './components/Fireworks';
import NextPiece from './components/NextPiece';
import { Play, Pause, RefreshCw, Power } from 'lucide-react';

// --- Utils ---
const createGrid = (): Grid => 
  Array.from(Array(BOARD_HEIGHT), () => Array(BOARD_WIDTH).fill(EMPTY_CELL));

const getRandomPiece = (): Piece => {
  const randomKey = TETROMINO_KEYS[Math.floor(Math.random() * TETROMINO_KEYS.length)];
  const randomColor = NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];
  const shape = TETROMINOS[randomKey].shape;
  
  return {
    position: { x: Math.floor(BOARD_WIDTH / 2) - Math.floor(shape[0].length / 2), y: 0 },
    shape,
    color: randomColor,
  };
};

const checkCollision = (
  piece: Piece, 
  grid: Grid, 
  moveX: number = 0, 
  moveY: number = 0
): boolean => {
  for (let y = 0; y < piece.shape.length; y++) {
    for (let x = 0; x < piece.shape[y].length; x++) {
      if (piece.shape[y][x] !== 0) {
        const nextY = y + piece.position.y + moveY;
        const nextX = x + piece.position.x + moveX;

        // Check boundaries
        if (
          nextY >= BOARD_HEIGHT || 
          nextX < 0 || 
          nextX >= BOARD_WIDTH ||
          (nextY >= 0 && grid[nextY][nextX] !== EMPTY_CELL)
        ) {
          return true;
        }
      }
    }
  }
  return false;
};

const rotateMatrix = (matrix: Shape): Shape => {
  const N = matrix.length;
  const rotated = matrix.map((row, i) =>
    row.map((val, j) => matrix[N - 1 - j][i])
  );
  return rotated;
};

// Hook for repeating button actions
const useButtonRepeat = (action: () => void, interval = 100, initialDelay = 200) => {
  const timerRef = useRef<number | null>(null);

  const start = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    // Prevent default to stop scrolling/selection, but allow if it's a simple click needed logic
    // e.preventDefault(); 
    action();
    // setTimeout returns a number in browser environment
    const timeoutId = window.setTimeout(() => {
      // setInterval returns a number in browser environment
      timerRef.current = window.setInterval(action, interval);
    }, initialDelay);
    timerRef.current = timeoutId;
  }, [action, interval, initialDelay]);

  const stop = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return {
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: stop,
    onTouchStart: start,
    onTouchEnd: stop,
  };
};

const App: React.FC = () => {
  const [grid, setGrid] = useState<Grid>(createGrid());
  const [activePiece, setActivePiece] = useState<Piece | null>(null);
  const [nextPiece, setNextPiece] = useState<Piece>(getRandomPiece());
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [dropSpeed, setDropSpeed] = useState(INITIAL_DROP_SPEED);
  
  const boardRef = useRef<HTMLDivElement>(null);
  const fireworksRef = useRef<FireworksHandle>(null);
  const dropTimeRef = useRef<number>(0);
  const requestRef = useRef<number>(0);
  const previousTimeRef = useRef<number>(0);

  // --- Game Control ---

  const startGame = () => {
    setGrid(createGrid());
    const firstPiece = getRandomPiece();
    setActivePiece(firstPiece);
    setNextPiece(getRandomPiece());
    setScore(0);
    setLevel(1);
    setGameOver(false);
    setIsPaused(false);
    setDropSpeed(INITIAL_DROP_SPEED);
    fireworksRef.current?.reset();
    previousTimeRef.current = 0;
  };

  const pauseGame = () => {
    if (!gameOver) setIsPaused(prev => !prev);
  };

  const resetGame = () => {
      startGame();
  }

  // --- Logic ---

  const sweepRows = useCallback((newGrid: Grid) => {
    let sweptRows = 0;
    const cleanGrid = newGrid.filter(row => {
      const isFull = row.every(cell => cell !== EMPTY_CELL);
      if (isFull) sweptRows++;
      return !isFull;
    });

    if (sweptRows > 0) {
      const emptyRows = Array.from({ length: sweptRows }, () => Array(BOARD_WIDTH).fill(EMPTY_CELL));
      const finalGrid = [...emptyRows, ...cleanGrid];
      setGrid(finalGrid);
      setScore(prev => prev + (sweptRows * 100 * level));
      setDropSpeed(prev => Math.max(MIN_DROP_SPEED, prev - (sweptRows * SPEED_INCREMENT)));
      
      // Trigger fireworks for each swept row
      // Find the Y indices of swept rows
      // Simple approximation: trigger at the top of the board or randomly
      // Better: calculate original indices. For now, let's just explode at the bottom.
      // Actually, let's explode in the middle for effect.
      for (let i = 0; i < sweptRows; i++) {
        // Delay slightly
        setTimeout(() => {
             fireworksRef.current?.explode(BOARD_HEIGHT - 1 - i * 2); 
        }, i * 200);
      }
    } else {
      setGrid(newGrid);
    }
  }, [level]);

  const moveDown = useCallback(() => {
    if (!activePiece || gameOver || isPaused) return;

    if (!checkCollision(activePiece, grid, 0, 1)) {
      setActivePiece(prev => ({
        ...prev!,
        position: { ...prev!.position, y: prev!.position.y + 1 }
      }));
    } else {
      // Lock piece
      if (activePiece.position.y <= 0) {
        setGameOver(true);
        return;
      }

      const newGrid = [...grid];
      activePiece.shape.forEach((row, y) => {
        row.forEach((cell, x) => {
          if (cell !== 0) {
            const boardY = y + activePiece.position.y;
            const boardX = x + activePiece.position.x;
            if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
                newGrid[boardY][boardX] = activePiece.color;
            }
          }
        });
      });

      sweepRows(newGrid);
      setActivePiece(nextPiece);
      setNextPiece(getRandomPiece());
    }
  }, [activePiece, grid, gameOver, isPaused, nextPiece, sweepRows]);

  const moveHorizontal = useCallback((dir: -1 | 1) => {
    if (!activePiece || gameOver || isPaused) return;
    if (!checkCollision(activePiece, grid, dir, 0)) {
      setActivePiece(prev => ({
        ...prev!,
        position: { ...prev!.position, x: prev!.position.x + dir }
      }));
    }
  }, [activePiece, grid, gameOver, isPaused]);

  const rotate = useCallback(() => {
    if (!activePiece || gameOver || isPaused) return;
    const rotatedShape = rotateMatrix(activePiece.shape);
    const newPiece = { ...activePiece, shape: rotatedShape };
    
    // Wall kicks (simple)
    if (!checkCollision(newPiece, grid)) {
      setActivePiece(newPiece);
    } else if (!checkCollision(newPiece, grid, -1, 0)) {
       setActivePiece({ ...newPiece, position: { ...newPiece.position, x: newPiece.position.x - 1 } });
    } else if (!checkCollision(newPiece, grid, 1, 0)) {
       setActivePiece({ ...newPiece, position: { ...newPiece.position, x: newPiece.position.x + 1 } });
    }
  }, [activePiece, grid, gameOver, isPaused]);

  const drop = useCallback(() => {
    if (!activePiece || gameOver || isPaused) return;
    let currentY = activePiece.position.y;
    while (!checkCollision(activePiece, grid, 0, currentY - activePiece.position.y + 1)) {
        currentY++;
    }
    // Snap to bottom
    const finalPiece = { ...activePiece, position: { ...activePiece.position, y: currentY } };
    
    // We manually update grid here to instant drop
    const newGrid = [...grid];
    finalPiece.shape.forEach((row, y) => {
        row.forEach((cell, x) => {
          if (cell !== 0) {
            const boardY = y + finalPiece.position.y;
            const boardX = x + finalPiece.position.x;
            if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
                newGrid[boardY][boardX] = finalPiece.color;
            }
          }
        });
    });
    sweepRows(newGrid);
    setActivePiece(nextPiece);
    setNextPiece(getRandomPiece());
  }, [activePiece, grid, gameOver, isPaused, nextPiece, sweepRows]);

  // --- Game Loop ---

  const gameLoop = (time: number) => {
    if (!isPaused && !gameOver) {
      const deltaTime = time - previousTimeRef.current;
      dropTimeRef.current += deltaTime;

      if (dropTimeRef.current > dropSpeed) {
        moveDown();
        dropTimeRef.current = 0;
      }
    }
    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(gameLoop);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isPaused, gameOver, dropSpeed, moveDown]);

  // --- Inputs ---
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver) return;
      switch (e.key) {
        case 'ArrowLeft': moveHorizontal(-1); break;
        case 'ArrowRight': moveHorizontal(1); break;
        case 'ArrowDown': moveDown(); break;
        case 'ArrowUp': rotate(); break;
        case ' ': drop(); break;
        case 'p': pauseGame(); break;
        case 'r': resetGame(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveHorizontal, moveDown, rotate, drop, pauseGame, resetGame, gameOver]);

  // Start game on mount
  useEffect(() => {
    startGame();
  }, []);

  // --- Render Helpers ---

  // Combine grid and active piece for rendering
  const renderGrid = grid.map(row => [...row]);
  if (activePiece) {
    activePiece.shape.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell !== 0) {
          const boardY = y + activePiece.position.y;
          const boardX = x + activePiece.position.x;
          if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
            renderGrid[boardY][boardX] = activePiece.color;
          }
        }
      });
    });
  }

  // Button repeat hooks
  const leftBtn = useButtonRepeat(() => moveHorizontal(-1));
  const rightBtn = useButtonRepeat(() => moveHorizontal(1));
  const downBtn = useButtonRepeat(moveDown, 50); // Fast soft drop

  return (
    <div className="fixed inset-0 bg-neutral-900 flex items-center justify-center overflow-hidden select-none">
      
      {/* Console Body */}
      <div className="relative w-full h-full md:h-[850px] md:w-[420px] bg-slate-300 md:rounded-[40px] shadow-2xl flex flex-col overflow-hidden md:border-b-8 md:border-r-8 border-slate-400/50">
        
        {/* Top Bezel & Screen Area */}
        <div className="flex-none p-4 sm:p-6 pb-8 bg-[#58595b] rounded-b-[40px] shadow-inner relative z-10">
            {/* Bezel Header */}
            <div className="flex justify-between items-center px-4 mb-2">
                <div className="text-gray-400 text-[10px] font-display tracking-widest">
                    <span className="mr-2 text-blue-400">●</span> 
                    NEON BLAST
                </div>
                <div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold">
                    BATTERY
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_5px_red]"></div>
                </div>
            </div>

            {/* LCD Screen Container */}
            <div className="bg-[#0f172a] rounded border-[10px] border-[#333] shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] aspect-[9/10] w-full max-w-[400px] mx-auto relative overflow-hidden flex">
                
                {/* Game Board Area */}
                <div ref={boardRef} className="relative flex-grow h-full bg-[#0f172a] border-r-2 border-gray-800">
                    {/* Grid Rendering */}
                    <div 
                        className="grid h-full w-full"
                        style={{
                            gridTemplateColumns: `repeat(${BOARD_WIDTH}, minmax(0, 1fr))`,
                            gridTemplateRows: `repeat(${BOARD_HEIGHT}, minmax(0, 1fr))`
                        }}
                    >
                        {renderGrid.map((row, y) => (
                            row.map((cell, x) => {
                                const isFilled = cell !== EMPTY_CELL;
                                return (
                                    <div 
                                        key={`${x}-${y}`}
                                        className={`w-full h-full relative transition-none ${isFilled ? 'z-10' : ''}`}
                                        style={{ 
                                            backgroundColor: isFilled ? (cell || 'transparent') : 'transparent',
                                            border: '1px solid rgba(236, 72, 153, 0.1)',
                                            boxShadow: isFilled ? `0 0 8px ${cell}, inset 0 0 4px rgba(255,255,255,0.5)` : 'none'
                                        }}
                                    />
                                );
                            })
                        ))}
                    </div>

                    {/* Overlays */}
                    <Fireworks 
                        ref={fireworksRef} 
                        width={boardRef.current?.offsetWidth || 300} 
                        height={boardRef.current?.offsetHeight || 600}
                        cellSize={(boardRef.current?.offsetWidth || 300) / BOARD_WIDTH}
                    />

                    {isPaused && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
                            <span className="font-retro text-4xl text-yellow-400 animate-pulse tracking-widest">PAUSED</span>
                        </div>
                    )}
                    
                    {gameOver && (
                        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50 backdrop-blur-sm">
                            <span className="font-retro text-5xl text-red-500 mb-4 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">GAME OVER</span>
                            <button 
                                onClick={resetGame}
                                className="px-4 py-2 bg-white text-black font-bold font-display text-xs rounded hover:bg-gray-200"
                            >
                                PRESS START
                            </button>
                        </div>
                    )}
                </div>

                {/* Sidebar Info (Inside Screen) */}
                <div className="w-[35%] h-full bg-[#1e293b] p-2 flex flex-col gap-4 border-l border-gray-700">
                    <div>
                        <div className="text-[10px] text-gray-400 font-display mb-1">SCORE</div>
                        <div className="font-retro text-xl text-green-400 leading-none">{score.toString().padStart(6, '0')}</div>
                    </div>
                    <div>
                        <div className="text-[10px] text-gray-400 font-display mb-1">LEVEL</div>
                        <div className="font-retro text-xl text-blue-400 leading-none">{level}</div>
                    </div>
                    <div className="flex-grow">
                         <div className="text-[10px] text-gray-400 font-display mb-1">NEXT</div>
                         <NextPiece piece={nextPiece} />
                    </div>
                </div>
            </div>
            
            <div className="text-center mt-2">
                 <h1 className="font-display italic font-black text-xl text-gray-400/50 tracking-wide">Nintendo<span className="text-xs align-top">®</span></h1>
            </div>
        </div>

        {/* Controls Area */}
        <div className="flex-grow relative bg-slate-300 flex flex-col justify-end pb-8 sm:pb-12">
            
            {/* Main Controls Row */}
            <div className="flex justify-between items-end px-6 sm:px-10 mb-8 sm:mb-12">
                
                {/* D-Pad */}
                <div className="relative w-32 h-32 sm:w-40 sm:h-40">
                    <div className="absolute inset-0 bg-slate-400/30 rounded-full transform scale-90"></div>
                    
                    {/* D-Pad Cross */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full">
                        {/* Center */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-[#222] z-10 rounded"></div>
                        
                        {/* Up (Drop Hard? Or Rotate?) - Let's map Up to Hard Drop for Console Feel */}
                        <button 
                            className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-16 bg-[#222] rounded-t shadow-[0_4px_0_#000] active:shadow-none active:translate-y-1 transition-all z-0 flex justify-center pt-2"
                            onClick={drop}
                        >
                            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-[#444]"></div>
                        </button>

                        {/* Down (Soft Drop) */}
                        <button 
                            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-16 bg-[#222] rounded-b shadow-[0_4px_0_#000] active:shadow-none active:translate-y-1 transition-all z-0 flex justify-center items-end pb-2"
                            {...downBtn}
                        >
                             <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[10px] border-t-[#444]"></div>
                        </button>

                        {/* Left */}
                        <button 
                            className="absolute top-1/2 left-0 -translate-y-1/2 w-16 h-10 bg-[#222] rounded-l shadow-[0_4px_0_#000] active:shadow-none active:translate-y-1 transition-all z-0 flex items-center justify-start pl-2"
                            {...leftBtn}
                        >
                             <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[10px] border-r-[#444]"></div>
                        </button>

                        {/* Right */}
                        <button 
                            className="absolute top-1/2 right-0 -translate-y-1/2 w-16 h-10 bg-[#222] rounded-r shadow-[0_4px_0_#000] active:shadow-none active:translate-y-1 transition-all z-0 flex items-center justify-end pr-2"
                            {...rightBtn}
                        >
                             <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[10px] border-l-[#444]"></div>
                        </button>
                    </div>
                </div>

                {/* A/B Buttons */}
                <div className="relative w-32 h-24 sm:w-40 sm:h-32 transform -rotate-[15deg]">
                    <div className="absolute bottom-0 left-0 flex flex-col items-center gap-1">
                         <button 
                            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-rose-700 shadow-[0_4px_0_#881337] active:shadow-none active:translate-y-1 transition-all flex items-center justify-center text-rose-900 font-bold text-xl"
                            onClick={drop} // B button maps to Drop (Hard)
                         >
                            B
                         </button>
                         <span className="font-display font-bold text-slate-500 text-xs">DROP</span>
                    </div>
                    <div className="absolute top-0 right-0 flex flex-col items-center gap-1">
                         <button 
                            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-rose-700 shadow-[0_4px_0_#881337] active:shadow-none active:translate-y-1 transition-all flex items-center justify-center text-rose-900 font-bold text-xl"
                            onClick={rotate} // A button maps to Rotate
                         >
                            A
                         </button>
                         <span className="font-display font-bold text-slate-500 text-xs">ROTATE</span>
                    </div>
                </div>
            </div>

            {/* Start/Select */}
            <div className="flex justify-center gap-6 sm:gap-8">
                <div className="flex flex-col items-center gap-1 transform rotate-[15deg]">
                    <button 
                        className="w-16 h-4 bg-slate-600 rounded-full shadow-[0_2px_0_#333] active:shadow-none active:translate-y-[1px]"
                        onClick={resetGame}
                    ></button>
                    <span className="font-display font-bold text-slate-500 text-[10px] tracking-widest">SELECT</span>
                </div>
                <div className="flex flex-col items-center gap-1 transform rotate-[15deg]">
                    <button 
                        className="w-16 h-4 bg-slate-600 rounded-full shadow-[0_2px_0_#333] active:shadow-none active:translate-y-[1px]"
                        onClick={pauseGame}
                    ></button>
                    <span className="font-display font-bold text-slate-500 text-[10px] tracking-widest">START</span>
                </div>
            </div>
        </div>

        {/* Speaker Grille */}
        <div className="absolute bottom-6 right-6 flex gap-2 transform -rotate-12 opacity-20 pointer-events-none">
            <div className="w-1.5 h-12 bg-black rounded-full"></div>
            <div className="w-1.5 h-12 bg-black rounded-full"></div>
            <div className="w-1.5 h-12 bg-black rounded-full"></div>
            <div className="w-1.5 h-12 bg-black rounded-full"></div>
            <div className="w-1.5 h-12 bg-black rounded-full"></div>
        </div>

      </div>
    </div>
  );
};

export default App;