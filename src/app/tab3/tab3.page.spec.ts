import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Tab3Page } from './tab3.page';
import { GameService } from '../services/game.service';

describe('Tab3Page', () => {
  let component: Tab3Page;
  let fixture: ComponentFixture<Tab3Page>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Tab3Page],
      providers: [GameService]
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create', () => {
    fixture = TestBed.createComponent(Tab3Page);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should calculate 4 player stats with separate own individual and team averages', () => {
    const game = {
      id: 'g1',
      mode: 4 as const,
      player1Name: 'Alice',
      player2Name: 'Bob',
      player3Name: 'Charlie',
      player4Name: 'David',
      player1Score: 121,
      player2Score: 80,
      player3Score: 121,
      player4Score: 80,
      winner: 1,
      date: Date.now(),
      duration: 300000,
      scoreLogs: [
        { id: '1', player: 1, delta: 10, newScore: 10, reason: 'Pegging', timestamp: Date.now() },
        { id: '2', player: 1, delta: 20, newScore: 30, reason: 'Hand points', timestamp: Date.now() },
        { id: '3', player: 3, delta: 5, newScore: 35, reason: 'Pegging', timestamp: Date.now() },
        { id: '4', player: 3, delta: 15, newScore: 50, reason: 'Crib points', timestamp: Date.now() },
        { id: '5', player: 2, delta: 8, newScore: 8, reason: 'Pegging', timestamp: Date.now() }
      ]
    };

    localStorage.setItem('cribbage_games_history', JSON.stringify([game]));

    // Now construct the fixture, which will construct GameService and load the localStorage item
    fixture = TestBed.createComponent(Tab3Page);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.playersList = [
      { id: '1', name: 'Alice', created: Date.now() },
      { id: '2', name: 'Bob', created: Date.now() },
      { id: '3', name: 'Charlie', created: Date.now() },
      { id: '4', name: 'David', created: Date.now() }
    ];
    component.selectedPlayerId = '1';
    component.statsModeFilter = '4';

    component.updateSelectedPlayerStats();

    const stats = component.activeStats;
    expect(stats).toBeTruthy();
    expect(stats.gamesPlayed).toBe(1);

    expect(stats.avgPegging).toBe(10);
    expect(stats.avgHand).toBe(20);
    expect(stats.avgCrib).toBe(0);
    expect(stats.avgScore).toBe(30);

    expect(stats.avgTeamPegging).toBe(15);
    expect(stats.avgTeamHand).toBe(20);
    expect(stats.avgTeamCrib).toBe(15);
    expect(stats.avgTeamScore).toBe(50);

    expect(stats.avgOpponentPegging).toBe(8);
    expect(stats.avgOpponentScore).toBe(8);
  });
});
