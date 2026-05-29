import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

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
}

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private readonly TARGET_SCORE = 121;
  private readonly STORAGE_KEY = 'cribbage_games_history';
  private readonly STATE_STORAGE_KEY = 'cribbage_current_game_state';
  private readonly PLAYERS_STORAGE_KEY = 'cribbage_player_profiles';

  private gameStateSub = new BehaviorSubject<GameState>(this.getDefaultState());
  public gameState$: Observable<GameState> = this.gameStateSub.asObservable();

  public get currentGameState(): GameState {
    return this.gameStateSub.value;
  }

  private historySub = new BehaviorSubject<CompletedGame[]>(this.loadHistoryFromStorage());
  public history$: Observable<CompletedGame[]> = this.historySub.asObservable();

  private playersSub = new BehaviorSubject<PlayerProfile[]>(this.loadPlayersFromStorage());
  public players$: Observable<PlayerProfile[]> = this.playersSub.asObservable();

  public showTabBar = true;
  private _isUnifiedView = localStorage.getItem('cribbage_is_unified_view') === 'true';

  public get isUnifiedView(): boolean {
    return this._isUnifiedView;
  }

  public set isUnifiedView(val: boolean) {
    this._isUnifiedView = val;
    localStorage.setItem('cribbage_is_unified_view', String(val));
    this.triggerHaptic(ImpactStyle.Light);
  }

  public toggleTabBar() {
    this.showTabBar = !this.showTabBar;
  }

  constructor() {
    this.restoreGameState();
  }

  private loadPlayersFromStorage(): PlayerProfile[] {
    try {
      const stored = localStorage.getItem(this.PLAYERS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      const defaults: PlayerProfile[] = [
        { id: '1', name: 'Player 1', created: Date.now() },
        { id: '2', name: 'Player 2', created: Date.now() }
      ];
      localStorage.setItem(this.PLAYERS_STORAGE_KEY, JSON.stringify(defaults));
      return defaults;
    } catch (e) {
      console.error('Failed to load players', e);
      return [];
    }
  }

  public createPlayer(name: string): PlayerProfile {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error('Name cannot be empty');
    }
    const current = this.playersSub.value;
    if (current.some(p => p.name.toLowerCase() === trimmed.toLowerCase())) {
      throw new Error('Player name already exists');
    }
    const newPlayer: PlayerProfile = {
      id: Math.random().toString(36).substring(2, 9),
      name: trimmed,
      created: Date.now()
    };
    const updated = [...current, newPlayer];
    this.playersSub.next(updated);
    localStorage.setItem(this.PLAYERS_STORAGE_KEY, JSON.stringify(updated));
    this.triggerHaptic(ImpactStyle.Light);
    return newPlayer;
  }

  public deletePlayer(id: string) {
    const current = this.playersSub.value;
    const updated = current.filter(p => p.id !== id);
    this.playersSub.next(updated);
    localStorage.setItem(this.PLAYERS_STORAGE_KEY, JSON.stringify(updated));
    this.triggerHaptic(ImpactStyle.Medium);
  }

  public updatePlayerName(id: string, newName: string) {
    const trimmed = newName.trim();
    if (!trimmed) {
      throw new Error('Name cannot be empty');
    }
    const current = this.playersSub.value;
    if (current.some(p => p.id !== id && p.name.toLowerCase() === trimmed.toLowerCase())) {
      throw new Error('Player name already exists');
    }
    
    // Propagate name change to history
    const oldPlayer = current.find(p => p.id === id);
    if (oldPlayer) {
      const oldName = oldPlayer.name;
      const currentHistory = this.historySub.value;
      const updatedHistory = currentHistory.map(game => {
        let modified = false;
        let p1Name = game.player1Name;
        let p2Name = game.player2Name;
        let p3Name = game.player3Name;
        let p4Name = game.player4Name;
        if (p1Name === oldName) {
          p1Name = trimmed;
          modified = true;
        }
        if (p2Name === oldName) {
          p2Name = trimmed;
          modified = true;
        }
        if (p3Name === oldName) {
          p3Name = trimmed;
          modified = true;
        }
        if (p4Name === oldName) {
          p4Name = trimmed;
          modified = true;
        }
        return modified ? { 
          ...game, 
          player1Name: p1Name, 
          player2Name: p2Name, 
          player3Name: p3Name, 
          player4Name: p4Name 
        } : game;
      });
      if (JSON.stringify(currentHistory) !== JSON.stringify(updatedHistory)) {
        this.historySub.next(updatedHistory);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedHistory));
      }
    }

    const updated = current.map(p => p.id === id ? { ...p, name: trimmed } : p);
    this.playersSub.next(updated);
    localStorage.setItem(this.PLAYERS_STORAGE_KEY, JSON.stringify(updated));
    this.triggerHaptic(ImpactStyle.Medium);
  }

  private getDefaultState(): GameState {
    return {
      isActive: false,
      mode: 2,
      player1: { name: 'Player 1', score: 0, prevScore: 0, color: 'var(--player-one-color)' },
      player2: { name: 'Player 2', score: 0, prevScore: 0, color: 'var(--player-two-color)' },
      scoreLogs: [],
      undoStack: [],
      redoStack: [],
      winner: null,
      startDate: Date.now(),
      endDate: null,
      playerRedoStacks: { 1: [], 2: [], 3: [], 4: [] },
      activeCrib: 1
    };
  }

  // --- Haptic Feedback Helper ---
  private async triggerHaptic(style: ImpactStyle = ImpactStyle.Light) {
    try {
      await Haptics.impact({ style });
    } catch (e) {
      // Haptics fail silently if running in a regular web browser
    }
  }

  // --- Active Game Logic ---
  public startNewGame(p1Name: string, p2Name: string, mode: 2 | 3 | 4 = 2, p3Name?: string, p4Name?: string) {
    const state: GameState = {
      isActive: true,
      mode: mode,
      player1: { name: p1Name.trim() || 'Player 1', score: 0, prevScore: 0, color: 'var(--player-one-color)' },
      player2: { name: p2Name.trim() || 'Player 2', score: 0, prevScore: 0, color: 'var(--player-two-color)' },
      scoreLogs: [],
      undoStack: [],
      redoStack: [],
      winner: null,
      startDate: Date.now(),
      endDate: null,
      playerRedoStacks: { 1: [], 2: [], 3: [], 4: [] },
      activeCrib: 1
    };

    if (mode === 3) {
      state.player3 = { name: (p3Name || '').trim() || 'Player 3', score: 0, prevScore: 0, color: 'var(--player-three-color)' };
    } else if (mode === 4) {
      state.player3 = { name: (p3Name || '').trim() || 'Player 3', score: 0, prevScore: 0, color: 'var(--player-three-color)' };
      state.player4 = { name: (p4Name || '').trim() || 'Player 4', score: 0, prevScore: 0, color: 'var(--player-four-color)' };
    }

    this.showTabBar = false;
    this.updateState(state);
    this.triggerHaptic(ImpactStyle.Medium);
  }

  public addPoints(playerNum: number, points: number, reason: string = 'Scored') {
    const state = { ...this.gameStateSub.value };
    if (!state.isActive || state.winner !== null) return;

    // Clear redo stack for this player's team/side
    if (!state.playerRedoStacks) {
      state.playerRedoStacks = { 1: [], 2: [], 3: [], 4: [] };
    }
    if (state.mode === 4) {
      const team = (playerNum === 1 || playerNum === 3) ? 1 : 2;
      state.playerRedoStacks[team === 1 ? 1 : 2] = [];
      state.playerRedoStacks[team === 1 ? 3 : 4] = [];
    } else {
      state.playerRedoStacks[playerNum] = [];
    }

    // Save previous state to undo stack
    state.undoStack.push(JSON.parse(JSON.stringify(state.scoreLogs)));
    state.redoStack = []; // Clear redo stack on new action

    let targetPlayer: Player;
    if (state.mode === 4) {
      if (playerNum === 1 || playerNum === 3) {
        targetPlayer = state.player1;
      } else {
        targetPlayer = state.player2;
      }
    } else {
      if (playerNum === 1) targetPlayer = state.player1;
      else if (playerNum === 2) targetPlayer = state.player2;
      else targetPlayer = state.player3!;
    }

    targetPlayer.prevScore = targetPlayer.score;
    targetPlayer.score = Math.min(targetPlayer.score + points, this.TARGET_SCORE);

    // Keep teammates scores synced in 4P mode
    if (state.mode === 4) {
      if (playerNum === 1 || playerNum === 3) {
        if (state.player3) {
          state.player3.prevScore = state.player1.prevScore;
          state.player3.score = state.player1.score;
        }
      } else {
        if (state.player4) {
          state.player4.prevScore = state.player2.prevScore;
          state.player4.score = state.player2.score;
        }
      }
    }

    // Create a score log entry
    const log: ScoreLog = {
      id: Math.random().toString(36).substring(2, 9),
      player: playerNum,
      delta: points,
      newScore: targetPlayer.score,
      reason: reason || (points > 0 ? `+${points} points` : 'No points'),
      timestamp: Date.now()
    };
    state.scoreLogs.push(log);

    // Check for Win condition
    if (targetPlayer.score >= this.TARGET_SCORE) {
      state.winner = (state.mode === 4)
        ? ((playerNum === 1 || playerNum === 3) ? 1 : 2)
        : playerNum;
      state.endDate = Date.now();
      this.triggerHaptic(ImpactStyle.Heavy);
      this.saveCompletedGame(state);
    } else {
      this.triggerHaptic(ImpactStyle.Light);
    }

    this.updateState(state);
  }

  private isLogForPlayerTeam(logPlayer: number, targetPlayer: number, mode: number): boolean {
    if (mode === 4) {
      const logTeam = (logPlayer === 1 || logPlayer === 3) ? 1 : 2;
      const targetTeam = (targetPlayer === 1 || targetPlayer === 3) ? 1 : 2;
      return logTeam === targetTeam;
    }
    return logPlayer === targetPlayer;
  }

  public undo(playerNum?: number) {
    const state = { ...this.gameStateSub.value };
    if (state.scoreLogs.length === 0) return;

    if (!state.playerRedoStacks) {
      state.playerRedoStacks = { 1: [], 2: [], 3: [], 4: [] };
    }

    if (playerNum === undefined) {
      // Legacy global undo fallback
      const log = state.scoreLogs.pop();
      if (log) {
        state.playerRedoStacks[log.player] = state.playerRedoStacks[log.player] || [];
        state.playerRedoStacks[log.player].push(log);
      }
    } else {
      // Player/Team specific undo
      let lastIndex = -1;
      for (let i = state.scoreLogs.length - 1; i >= 0; i--) {
        if (this.isLogForPlayerTeam(state.scoreLogs[i].player, playerNum, state.mode)) {
          lastIndex = i;
          break;
        }
      }

      if (lastIndex !== -1) {
        const log = state.scoreLogs.splice(lastIndex, 1)[0];
        state.playerRedoStacks[playerNum] = state.playerRedoStacks[playerNum] || [];
        state.playerRedoStacks[playerNum].push(log);
      }
    }

    // Recalculate
    this.recalculateScoresFromLogs(state);
    state.winner = null;
    state.endDate = null;
    state.isActive = true;

    this.updateState(state);
    this.triggerHaptic(ImpactStyle.Light);
  }

  public redo(playerNum?: number) {
    const state = { ...this.gameStateSub.value };
    if (!state.playerRedoStacks) {
      state.playerRedoStacks = { 1: [], 2: [], 3: [], 4: [] };
    }

    let log: ScoreLog | undefined;
    if (playerNum === undefined) {
      // Legacy global redo fallback
      for (const p of [1, 2, 3, 4]) {
        const stack = state.playerRedoStacks[p] || [];
        if (stack.length > 0) {
          log = stack.pop();
          break;
        }
      }
    } else {
      const stack = state.playerRedoStacks[playerNum] || [];
      if (stack.length > 0) {
        log = stack.pop();
      }
    }

    if (log) {
      state.scoreLogs.push(log);
      this.recalculateScoresFromLogs(state);

      // Check for Win again
      let targetPlayer: Player;
      if (state.mode === 4) {
        targetPlayer = (log.player === 1 || log.player === 3) ? state.player1 : state.player2;
      } else {
        targetPlayer = log.player === 1 ? state.player1 : (log.player === 2 ? state.player2 : state.player3!);
      }

      if (targetPlayer.score >= this.TARGET_SCORE) {
        state.winner = (state.mode === 4)
          ? ((log.player === 1 || log.player === 3) ? 1 : 2)
          : log.player;
        state.endDate = Date.now();
        this.saveCompletedGame(state);
      }
    }

    this.updateState(state);
    this.triggerHaptic(ImpactStyle.Light);
  }

  public resetGame() {
    this.showTabBar = true;
    const state = this.getDefaultState();
    this.updateState(state);
    localStorage.removeItem(this.STATE_STORAGE_KEY);
    this.triggerHaptic(ImpactStyle.Medium);
  }

  private recalculateScoresFromLogs(state: GameState) {
    state.player1.score = 0;
    state.player1.prevScore = 0;
    state.player2.score = 0;
    state.player2.prevScore = 0;
    if (state.player3) {
      state.player3.score = 0;
      state.player3.prevScore = 0;
    }
    if (state.player4) {
      state.player4.score = 0;
      state.player4.prevScore = 0;
    }

    for (const log of state.scoreLogs) {
      const playerNum = log.player;
      if (state.mode === 4) {
        if (playerNum === 1 || playerNum === 3) {
          state.player1.prevScore = state.player1.score;
          state.player1.score = Math.min(state.player1.score + log.delta, this.TARGET_SCORE);
          if (state.player3) {
            state.player3.prevScore = state.player1.prevScore;
            state.player3.score = state.player1.score;
          }
        } else {
          state.player2.prevScore = state.player2.score;
          state.player2.score = Math.min(state.player2.score + log.delta, this.TARGET_SCORE);
          if (state.player4) {
            state.player4.prevScore = state.player2.prevScore;
            state.player4.score = state.player2.score;
          }
        }
      } else {
        const player = playerNum === 1 ? state.player1 : (playerNum === 2 ? state.player2 : state.player3);
        if (player) {
          player.prevScore = player.score;
          player.score = Math.min(player.score + log.delta, this.TARGET_SCORE);
        }
      }
    }
  }

  private updateState(state: GameState) {
    this.gameStateSub.next(state);
    localStorage.setItem(this.STATE_STORAGE_KEY, JSON.stringify(state));
  }

  private restoreGameState() {
    try {
      const stored = localStorage.getItem(this.STATE_STORAGE_KEY);
      if (stored) {
        const state = JSON.parse(stored);
        this.gameStateSub.next(state);
        if (state.isActive) {
          this.showTabBar = false;
        }
      }
    } catch (e) {
      console.error('Failed to restore active game state', e);
    }
  }

  // --- Active Crib & Reordering Functions ---
  public setActiveCrib(playerNum: number) {
    const state = this.gameStateSub.value;
    if (!state.isActive) return;
    state.activeCrib = playerNum;
    this.updateState(state);
    this.triggerHaptic(ImpactStyle.Light);
  }

  public newHand() {
    const state = this.gameStateSub.value;
    if (!state.isActive) return;

    // Swap/Rotate active crib
    if (state.mode === 3) {
      state.activeCrib = (state.activeCrib ? state.activeCrib : 1) % 3 + 1; // 1 -> 2 -> 3 -> 1
    } else {
      state.activeCrib = state.activeCrib === 1 ? 2 : 1; // 1 -> 2 -> 1
    }

    this.updateState(state);
    this.triggerHaptic(ImpactStyle.Medium);
  }

  public swapPlayers3P(idx1: number, idx2: number) {
    const state = this.gameStateSub.value;
    if (!state.isActive || state.mode !== 3) return;

    let p1: Player | undefined;
    let p2: Player | undefined;

    if (idx1 === 1) p1 = state.player1;
    else if (idx1 === 2) p1 = state.player2;
    else if (idx1 === 3) p1 = state.player3;

    if (idx2 === 1) p2 = state.player1;
    else if (idx2 === 2) p2 = state.player2;
    else if (idx2 === 3) p2 = state.player3;

    if (!p1 || !p2) return;

    const p1Temp = { ...p1 };
    const p2Temp = { ...p2 };
    const p1Color = p1.color;
    const p2Color = p2.color;

    // Swap players in state, keeping the color bound to the physical seat/lane
    if (idx1 === 1) state.player1 = { ...p2Temp, color: p1Color };
    else if (idx1 === 2) state.player2 = { ...p2Temp, color: p1Color };
    else if (idx1 === 3) state.player3 = { ...p2Temp, color: p1Color };

    if (idx2 === 1) state.player1 = { ...p1Temp, color: p2Color };
    else if (idx2 === 2) state.player2 = { ...p1Temp, color: p2Color };
    else if (idx2 === 3) state.player3 = { ...p1Temp, color: p2Color };

    // Helper to swap player indices in logs
    const swapLogPlayer = (logs: ScoreLog[]) => {
      for (const log of logs) {
        if (log.player === idx1) {
          log.player = idx2;
        } else if (log.player === idx2) {
          log.player = idx1;
        }
      }
    };

    // Swap scoreLogs
    swapLogPlayer(state.scoreLogs);

    // Swap undoStack
    for (const stack of state.undoStack) {
      swapLogPlayer(stack);
    }

    // Swap redoStack
    for (const stack of state.redoStack) {
      swapLogPlayer(stack);
    }

    // Swap playerRedoStacks and update internal log player properties
    if (state.playerRedoStacks) {
      if (state.playerRedoStacks[idx1]) swapLogPlayer(state.playerRedoStacks[idx1]);
      if (state.playerRedoStacks[idx2]) swapLogPlayer(state.playerRedoStacks[idx2]);
      const tempStack = state.playerRedoStacks[idx1];
      state.playerRedoStacks[idx1] = state.playerRedoStacks[idx2];
      state.playerRedoStacks[idx2] = tempStack;
    }

    // Swap activeCrib seat index if it was one of the swapped seats
    if (state.activeCrib === idx1) {
      state.activeCrib = idx2;
    } else if (state.activeCrib === idx2) {
      state.activeCrib = idx1;
    }

    this.triggerHaptic(ImpactStyle.Light);
    this.updateState(state);
  }

  // --- Game History Management ---
  private saveCompletedGame(state: GameState) {
    if (!state.endDate || state.winner === null) return;

    const newGame: CompletedGame = {
      id: Math.random().toString(36).substring(2, 9),
      mode: state.mode || 2,
      player1Name: state.player1.name,
      player2Name: state.player2.name,
      player3Name: state.player3?.name,
      player4Name: state.player4?.name,
      player1Score: state.player1.score,
      player2Score: state.player2.score,
      player3Score: state.player3?.score,
      player4Score: state.player4?.score,
      winner: state.winner,
      scoreLogs: state.scoreLogs,
      date: state.endDate,
      duration: state.endDate - state.startDate
    };

    const currentHistory = this.historySub.value;
    const updatedHistory = [newGame, ...currentHistory];
    
    this.historySub.next(updatedHistory);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedHistory));
  }

  private loadHistoryFromStorage(): CompletedGame[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Failed to load games history', e);
      return [];
    }
  }

  public deleteGameFromHistory(id: string) {
    const updatedHistory = this.historySub.value.filter(game => game.id !== id);
    this.historySub.next(updatedHistory);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedHistory));
    this.triggerHaptic(ImpactStyle.Medium);
  }

  public clearHistory() {
    this.historySub.next([]);
    localStorage.removeItem(this.STORAGE_KEY);
    this.triggerHaptic(ImpactStyle.Heavy);
  }
}
