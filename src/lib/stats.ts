export interface DailyResult {
  date: string;
  correct: number;
  total: number;
  stars: number;
  score: number;
  recalledIds: string[];
  itemIds: string[];
}

export interface Stats {
  level: number;
  bestLevel: number;
  roundsPlayed: number;
  wins: number;
  perfectRounds: number;
  correctItems: number;
  totalItems: number;
  wrongGuesses: number;
  bestScore: number;
  streak: number;
  bestStreak: number;
  lastDailyDate: string | null;
  daily: DailyResult | null;
  trainingDone: boolean;
}

export const DEFAULT_STATS: Stats = {
  level: 1,
  bestLevel: 1,
  roundsPlayed: 0,
  wins: 0,
  perfectRounds: 0,
  correctItems: 0,
  totalItems: 0,
  wrongGuesses: 0,
  bestScore: 0,
  streak: 0,
  bestStreak: 0,
  lastDailyDate: null,
  daily: null,
  trainingDone: false,
};
