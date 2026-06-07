export interface PlayerProfile {
  id: string;
  name: string;
  created: number;
}

export interface ScoreLog {
  id: string;
  player: number; // 1 | 2 | 3 | 4
  delta: number;
  newScore: number;
  reason: string;
  timestamp: number;
}

export interface Player {
  name: string;
  score: number;
  prevScore: number; // For rendering the trailing peg on the board
  color: string;
}

export interface GameState {
  isActive: boolean;
  mode: 2 | 3 | 4;
  player1: Player;
  player2: Player;
  player3?: Player;
  player4?: Player;
  scoreLogs: ScoreLog[];
  undoStack: ScoreLog[][]; // Nested logs for restoring entire states
  redoStack: ScoreLog[][];
  winner: number | null; // 1 | 2 | 3 | null
  startDate: number;
  endDate: number | null;
  playerRedoStacks?: { [player: number]: ScoreLog[] };
  activeCrib: number | null; // 1 | 2 | 3 | null
}

export interface CompletedGame {
  id: string;
  mode?: 2 | 3 | 4;
  player1Name: string;
  player2Name: string;
  player3Name?: string;
  player4Name?: string;
  player1Score: number;
  player2Score: number;
  player3Score?: number;
  player4Score?: number;
  winner: number; // 1 | 2 | 3
  scoreLogs: ScoreLog[];
  date: number;
  duration: number; // in milliseconds
  synced?: boolean; // true if saved to Supabase, false/undefined if local only
  excluded?: boolean; // true if excluded from statistics calculations
}
