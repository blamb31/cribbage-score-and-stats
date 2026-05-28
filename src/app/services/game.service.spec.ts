import { TestBed } from '@angular/core/testing';
import { GameService, GameState } from './game.service';

describe('GameService', () => {
  let service: GameService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(GameService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize default state correctly', () => {
    const state = service.currentGameState;
    expect(state.isActive).toBeFalse();
    expect(state.activeCrib).toBe(1);
  });

  it('should start game and set activeCrib', () => {
    service.startNewGame('Alice', 'Bob', 2);
    let state = service.currentGameState;
    expect(state.isActive).toBeTrue();
    expect(state.player1.name).toBe('Alice');
    expect(state.player2.name).toBe('Bob');
    expect(state.activeCrib).toBe(1);

    service.setActiveCrib(2);
    state = service.currentGameState;
    expect(state.activeCrib).toBe(2);
  });

  it('should toggle activeCrib on newHand', () => {
    service.startNewGame('Alice', 'Bob', 2);
    expect(service.currentGameState.activeCrib).toBe(1);

    service.newHand();
    expect(service.currentGameState.activeCrib).toBe(2);

    service.newHand();
    expect(service.currentGameState.activeCrib).toBe(1);
  });

  it('should rotate activeCrib on newHand for 3 Players', () => {
    service.startNewGame('Alice', 'Bob', 3, 'Charlie');
    expect(service.currentGameState.activeCrib).toBe(1);

    service.newHand();
    expect(service.currentGameState.activeCrib).toBe(2);

    service.newHand();
    expect(service.currentGameState.activeCrib).toBe(3);

    service.newHand();
    expect(service.currentGameState.activeCrib).toBe(1);
  });

  it('should swap 3 players, updating score logs, undo, redo, and playerRedoStacks correctly', () => {
    service.startNewGame('Alice', 'Bob', 3, 'Charlie');
    
    // Add points to Alice (Player 1)
    service.addPoints(1, 10, 'Pegging'); // log for P1
    // Add points to Bob (Player 2)
    service.addPoints(2, 5, 'Pegging');  // log for P2
    
    let state = service.currentGameState;
    expect(state.player1.name).toBe('Alice');
    expect(state.player1.score).toBe(10);
    expect(state.player2.name).toBe('Bob');
    expect(state.player2.score).toBe(5);
    expect(state.player3!.name).toBe('Charlie');
    expect(state.player3!.score).toBe(0);

    // Let's perform an undo on Player 2 to populate playerRedoStacks[2]
    service.undo(2);
    state = service.currentGameState;
    expect(state.player2.score).toBe(0);
    expect(state.playerRedoStacks![2].length).toBe(1);
    expect(state.playerRedoStacks![2][0].player).toBe(2);

    // Set crib to Player 1
    service.setActiveCrib(1);

    // Now swap Player 1 (Alice) and Player 2 (Bob)
    service.swapPlayers3P(1, 2);
    state = service.currentGameState;

    // Names should swap
    expect(state.player1.name).toBe('Bob');
    expect(state.player2.name).toBe('Alice');

    // Scores should swap
    expect(state.player1.score).toBe(0);
    expect(state.player2.score).toBe(10);

    // Crib should follow Player 1 to seat 2
    expect(state.activeCrib).toBe(2);

    // Undo stack and log player indices should swap
    expect(state.scoreLogs.length).toBe(1);
    expect(state.scoreLogs[0].player).toBe(2); // Was P1, now P2 (Alice is P2 now)

    // Redo stacks should swap and update indices
    expect(state.playerRedoStacks![1].length).toBe(1); // Was at [2], now at [1]
    expect(state.playerRedoStacks![1][0].player).toBe(1); // Was player 2, now player 1 (Bob is P1 now)
    expect(state.playerRedoStacks![2].length).toBe(0);

    // Let's redo Bob's score (now at index 1)
    service.redo(1);
    state = service.currentGameState;
    expect(state.player1.name).toBe('Bob');
    expect(state.player1.score).toBe(5); // Bob gets his 5 points back
  });
});
