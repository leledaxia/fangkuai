export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

export const TETROMINOS = {
  I: { shape: [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]] },
  J: { shape: [[0, 1, 0], [0, 1, 0], [1, 1, 0]] },
  L: { shape: [[0, 1, 0], [0, 1, 0], [0, 1, 1]] },
  O: { shape: [[1, 1], [1, 1]] },
  S: { shape: [[0, 1, 1], [1, 1, 0], [0, 0, 0]] },
  T: { shape: [[0, 1, 0], [1, 1, 1], [0, 0, 0]] },
  Z: { shape: [[1, 1, 0], [0, 1, 1], [0, 0, 0]] },
};

export const TETROMINO_KEYS = Object.keys(TETROMINOS) as Array<keyof typeof TETROMINOS>;

// Vibrant neon colors
export const NEON_COLORS = [
  '#f43f5e', // Rose
  '#ec4899', // Pink
  '#d946ef', // Fuchsia
  '#8b5cf6', // Violet
  '#6366f1', // Indigo
  '#3b82f6', // Blue
  '#06b6d4', // Cyan
  '#14b8a6', // Teal
  '#22c55e', // Green
  '#eab308', // Yellow
  '#f97316', // Orange
];

export const EMPTY_CELL = null;

export const INITIAL_DROP_SPEED = 800;
export const MIN_DROP_SPEED = 100;
export const SPEED_INCREMENT = 50;