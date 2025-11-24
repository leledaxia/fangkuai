export type Cell = string | null; // string is the hex color code
export type Grid = Cell[][];

export type Shape = number[][];

export interface Piece {
  position: { x: number; y: number };
  shape: Shape;
  color: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  size: number;
  life: number;
}