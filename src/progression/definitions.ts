import type { AchievementDef, DailyMissionDef } from './types';

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  /* Clears — single turn */
  { id: 'clear-8-one-turn', title: 'Cluster Buster', description: 'Clear 8+ tiles in a single move.', icon: '💥', category: 'clears' },
  { id: 'clear-12-one-turn', title: 'Wide Sweep', description: 'Clear 12+ tiles in a single move.', icon: '🌊', category: 'clears' },
  { id: 'clear-16-one-turn', title: 'Screen Shake', description: 'Clear 16+ tiles in a single move.', icon: '📳', category: 'clears' },
  { id: 'clear-20-one-turn', title: 'Twenty Piece', description: 'Clear 20+ tiles in a single move.', icon: '✨', category: 'clears' },
  { id: 'clear-28-one-turn', title: 'Tile Tsunami', description: 'Clear 28+ tiles in a single move.', icon: '🌀', category: 'clears' },
  { id: 'clear-36-one-turn', title: 'Total Wipeout', description: 'Clear 36+ tiles in a single move.', icon: '🔥', category: 'clears' },
  /* Chains — cascade waves in one turn */
  { id: 'chain-2', title: 'Double Tap', description: 'Chain 2+ match waves in one move.', icon: '⛓️', category: 'chains' },
  { id: 'chain-3', title: 'Triple Ripple', description: 'Chain 3+ match waves in one move.', icon: '〰️', category: 'chains' },
  { id: 'chain-4', title: 'Quad Cascade', description: 'Chain 4+ match waves in one move.', icon: '🎯', category: 'chains' },
  { id: 'chain-5', title: 'High Voltage', description: 'Chain 5+ match waves in one move.', icon: '⚡', category: 'chains' },
  { id: 'chain-6', title: 'Unbroken', description: 'Chain 6+ match waves in one move.', icon: '🌩️', category: 'chains' },
  { id: 'chain-8', title: 'Infinity Loop', description: 'Chain 8+ match waves in one move.', icon: '♾️', category: 'chains' },
  { id: 'chain-10', title: 'Aftershock', description: 'Chain 10+ match waves in one move.', icon: '📡', category: 'chains' },
  /* Explosives */
  { id: 'bombs-5', title: 'Fuse Lit', description: 'Detonate 5 bombs (lifetime).', icon: '🧨', category: 'explosives' },
  { id: 'bombs-25', title: 'Blast Radius', description: 'Detonate 25 bombs (lifetime).', icon: '💣', category: 'explosives' },
  { id: 'bombs-100', title: 'Demolition Crew', description: 'Detonate 100 bombs (lifetime).', icon: '🏗️', category: 'explosives' },
  { id: 'bombs-500', title: 'Ground Zero', description: 'Detonate 500 bombs (lifetime).', icon: '☢️', category: 'explosives' },
  /* Lifetime tiles */
  { id: 'tiles-500', title: 'Half K', description: 'Clear 500 tiles (lifetime).', icon: '🧩', category: 'dedication' },
  { id: 'tiles-2000', title: 'Two Thousand Club', description: 'Clear 2,000 tiles (lifetime).', icon: '📊', category: 'dedication' },
  { id: 'tiles-10000', title: 'Ten Thousand Tiles', description: 'Clear 10,000 tiles (lifetime).', icon: '🏆', category: 'dedication' },
  { id: 'tiles-50000', title: 'Factory Floor', description: 'Clear 50,000 tiles (lifetime).', icon: '🏭', category: 'dedication' },
  { id: 'tiles-100000', title: 'Century Mark', description: 'Clear 100,000 tiles (lifetime).', icon: '💯', category: 'dedication' },
  /* Swaps */
  { id: 'swaps-100', title: 'Hands On', description: 'Make 100 valid swaps (lifetime).', icon: '🤝', category: 'dedication' },
  { id: 'swaps-1000', title: 'Muscle Memory', description: 'Make 1,000 valid swaps (lifetime).', icon: '🧠', category: 'dedication' },
  { id: 'swaps-5000', title: 'Swap Machine', description: 'Make 5,000 valid swaps (lifetime).', icon: '⚙️', category: 'dedication' },
  /* Campaign */
  { id: 'levels-1', title: 'First Step', description: 'Complete your first stage.', icon: '👣', category: 'campaign' },
  { id: 'levels-5', title: 'Getting Warm', description: 'Complete 5 stages (lifetime).', icon: '🔥', category: 'campaign' },
  { id: 'levels-10', title: 'Double Digits', description: 'Complete 10 stages (lifetime).', icon: '🔟', category: 'campaign' },
  { id: 'levels-25', title: 'Quarter Century', description: 'Complete 25 stages (lifetime).', icon: '📅', category: 'campaign' },
  { id: 'levels-50', title: 'Half Century', description: 'Complete 50 stages (lifetime).', icon: '🎖️', category: 'campaign' },
  { id: 'levels-100', title: 'Centurion', description: 'Complete 100 stages (lifetime).', icon: '🛡️', category: 'campaign' },
  { id: 'levels-250', title: 'Marathon', description: 'Complete 250 stages (lifetime).', icon: '🏃', category: 'campaign' },
  { id: 'levels-500', title: 'Iron Will', description: 'Complete 500 stages (lifetime).', icon: '⚔️', category: 'campaign' },
  /* Score milestones (lifetime total across completed runs — tracked as totalScoreAccumulated) */
  { id: 'score-10k', title: 'Five Figures', description: 'Earn 10,000 total score across completed stages.', icon: '📈', category: 'mastery' },
  { id: 'score-50k', title: 'Serious Business', description: 'Earn 50,000 total score across completed stages.', icon: '💼', category: 'mastery' },
  { id: 'score-250k', title: 'Score Baron', description: 'Earn 250,000 total score across completed stages.', icon: '👑', category: 'mastery' },
  { id: 'score-1m', title: 'Millionaire', description: 'Earn 1,000,000 total score across completed stages.', icon: '💎', category: 'mastery' },
  /* Records */
  { id: 'record-tiles-40', title: 'Forty Fold', description: 'Clear 40+ tiles in a single move (lifetime best).', icon: '🎪', category: 'clears' },
  /* Games played */
  { id: 'games-10', title: 'Regular', description: 'Start 10 games.', icon: '🎮', category: 'dedication' },
  { id: 'games-50', title: 'Dedicated', description: 'Start 50 games.', icon: '🕹️', category: 'dedication' },
  { id: 'games-200', title: 'Main Menu Resident', description: 'Start 200 games.', icon: '🏠', category: 'dedication' },
];

export const DAILY_MISSION_POOL: readonly DailyMissionDef[] = [
  { id: 'd-tiles-40', description: 'Clear 40 tiles today.', target: 40, metric: 'daily_tiles' },
  { id: 'd-tiles-80', description: 'Clear 80 tiles today.', target: 80, metric: 'daily_tiles' },
  { id: 'd-tiles-120', description: 'Clear 120 tiles today.', target: 120, metric: 'daily_tiles' },
  { id: 'd-tiles-200', description: 'Clear 200 tiles today.', target: 200, metric: 'daily_tiles' },
  { id: 'd-levels-1', description: 'Complete 1 stage today.', target: 1, metric: 'daily_levels' },
  { id: 'd-levels-2', description: 'Complete 2 stages today.', target: 2, metric: 'daily_levels' },
  { id: 'd-levels-3', description: 'Complete 3 stages today.', target: 3, metric: 'daily_levels' },
  { id: 'd-bombs-2', description: 'Detonate 2 bombs today.', target: 2, metric: 'daily_bombs' },
  { id: 'd-bombs-4', description: 'Detonate 4 bombs today.', target: 4, metric: 'daily_bombs' },
  { id: 'd-bombs-6', description: 'Detonate 6 bombs today.', target: 6, metric: 'daily_bombs' },
  { id: 'd-chain-3', description: 'Build a chain of 3+ waves in a single move today.', target: 3, metric: 'daily_best_chain' },
  { id: 'd-chain-4', description: 'Build a chain of 4+ waves in a single move today.', target: 4, metric: 'daily_best_chain' },
  { id: 'd-chain-5', description: 'Build a chain of 5+ waves in a single move today.', target: 5, metric: 'daily_best_chain' },
  { id: 'd-tiles-60', description: 'Clear 60 tiles today.', target: 60, metric: 'daily_tiles' },
  { id: 'd-bombs-8', description: 'Detonate 8 bombs today.', target: 8, metric: 'daily_bombs' },
];

export const DAILY_PICK_COUNT = 3;
