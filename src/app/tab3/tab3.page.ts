import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonSegment, IonSegmentButton, 
  IonSelect, IonSelectOption, IonList, IonItem, IonLabel, IonNote, IonIcon, 
  IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonRow, IonCol,
  IonModal
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  chevronDownOutline, chevronUpOutline, trashOutline, trophyOutline, 
  timeOutline, calendarOutline, barChartOutline, analyticsOutline,
  createOutline, personRemoveOutline
} from 'ionicons/icons';
import { GameService, CompletedGame, PlayerProfile } from '../services/game.service';
import { OnboardingService } from '../services/onboarding.service';
import { Subscription } from 'rxjs';

export interface PlayerStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  skunkWins: number;
  doubleSkunkWins: number;
  skunkLosses: number;
  doubleSkunkLosses: number;
  avgScore: number;
  avgPegging: number;
  avgHand: number;
  avgCrib: number;
  avgTeamScore?: number;
  avgTeamPegging?: number;
  avgTeamHand?: number;
  avgTeamCrib?: number;
  avgOpponentScore: number;
  avgOpponentPegging: number;
  avgOpponentHand: number;
  avgOpponentCrib: number;
}

@Component({
    selector: 'app-tab3',
    templateUrl: 'tab3.page.html',
    styleUrls: ['tab3.page.scss'],
    imports: [
    CommonModule,
    FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonSegment, IonSegmentButton, 
    IonSelect, IonSelectOption, IonList, IonItem, IonLabel, IonNote, IonIcon, 
    IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonRow, IonCol,
    IonModal
]
})
export class Tab3Page implements OnInit, OnDestroy {
  public activeSegment: 'stats' | 'history' = 'stats';
  
  public playersList: PlayerProfile[] = [];
  public historyList: CompletedGame[] = [];
  public selectedPlayerId = '';
  
  public activeStats!: PlayerStats;
  public expandedGameId: string | null = null;
  public showDeleteConfirm = false;
  public gameIdToDelete: string | null = null;
  public showEditPlayerModal = false;
  public editPlayerName = '';
  public showDeletePlayerModal = false;
  public statsModeFilter: 'all' | '2' | '3' | '4' = '2';

  private playersSub!: Subscription;
  private historySub!: Subscription;

  constructor(
    public gameService: GameService,
    public onboardingService: OnboardingService
  ) {
    addIcons({
      chevronDownOutline, chevronUpOutline, trashOutline, trophyOutline, 
      timeOutline, calendarOutline, barChartOutline, analyticsOutline,
      createOutline, personRemoveOutline
    });
  }

  public ionViewDidEnter() {
    setTimeout(() => {
      this.triggerStatsOnboarding();
    }, 300);
  }

  private triggerStatsOnboarding() {
    this.onboardingService.start('onboarded_stats', [
      {
        targetId: 'stats-player-select',
        title: 'Player Selector',
        description: 'Choose a player profile to inspect. You can also rename or delete player profiles here.'
      },
      {
        targetId: 'stats-player-count',
        title: 'Player Count Filter',
        description: 'Filter stats by 2, 3, or 4 player modes. Cribbage stats differ significantly depending on the player count!'
      },
      {
        targetId: 'stats-records-card',
        title: 'Win/Loss Records',
        description: 'View total games played, win rate percentage, and special achievements like Skunks and Double Skunks.'
      },
      {
        targetId: 'stats-averages-table',
        title: 'Averages Breakdown',
        description: 'Analyze average points scored in each phase: Pegging, Hand, and Crib, contrasted against opponent averages.'
      },
      {
        targetId: 'stats-logs-list',
        title: 'Match History Logs',
        description: 'Switch tabs at the top to view the scrollable match history log, where you can view detail breakdowns or delete logs.'
      }
    ]);
  }

  ngOnInit() {
    this.playersSub = this.gameService.players$.subscribe(players => {
      this.playersList = players;
      if (players.length > 0 && !this.selectedPlayerId) {
        this.selectedPlayerId = players[0].id;
        this.updateSelectedPlayerStats();
      }
    });

    this.historySub = this.gameService.history$.subscribe(history => {
      this.historyList = history;
      this.updateSelectedPlayerStats();
    });
  }

  ngOnDestroy() {
    if (this.playersSub) this.playersSub.unsubscribe();
    if (this.historySub) this.historySub.unsubscribe();
  }

  public onPlayerChange() {
    this.updateSelectedPlayerStats();
  }

  public toggleExpandGame(gameId: string) {
    this.expandedGameId = this.expandedGameId === gameId ? null : gameId;
  }

  public getSelectedPlayerName(): string {
    const p = this.playersList.find(x => x.id === this.selectedPlayerId);
    return p ? p.name : '';
  }

  public getFirstName(name: string | undefined | null): string {
    if (!name) return '';
    return name.trim().split(/\s+/)[0];
  }

  public updateSelectedPlayerStats() {
    const name = this.getSelectedPlayerName();
    if (name) {
      this.activeStats = this.calculateStats(name);
    } else {
      this.activeStats = null as any;
    }
  }

  public openEditPlayerModal() {
    this.editPlayerName = this.getSelectedPlayerName();
    this.showEditPlayerModal = true;
  }

  public savePlayerName() {
    if (!this.editPlayerName.trim()) return;
    try {
      this.gameService.updatePlayerName(this.selectedPlayerId, this.editPlayerName);
      this.showEditPlayerModal = false;
      this.updateSelectedPlayerStats();
    } catch (e: any) {
      alert(e.message || 'Error updating player name');
    }
  }

  public openDeletePlayerModal() {
    this.showDeletePlayerModal = true;
  }

  public confirmDeletePlayer() {
    if (this.selectedPlayerId) {
      this.gameService.deletePlayer(this.selectedPlayerId);
      this.selectedPlayerId = '';
    }
    this.showDeletePlayerModal = false;
  }

  public deleteGame(id: string, event: Event) {
    event.stopPropagation();
    this.gameIdToDelete = id;
    this.showDeleteConfirm = true;
  }

  public confirmDelete() {
    if (this.gameIdToDelete) {
      this.gameService.deleteGameFromHistory(this.gameIdToDelete);
      this.gameIdToDelete = null;
      this.updateSelectedPlayerStats();
    }
    this.showDeleteConfirm = false;
  }

  public getGameBreakdown(game: CompletedGame) {
    const breakdown = {
      p1: { pegging: 0, hand: 0, crib: 0 },
      p2: { pegging: 0, hand: 0, crib: 0 },
      p3: { pegging: 0, hand: 0, crib: 0 },
      p4: { pegging: 0, hand: 0, crib: 0 }
    };

    for (const log of game.scoreLogs) {
      const reasonLower = log.reason.toLowerCase();
      let cat: 'pegging' | 'hand' | 'crib' = 'pegging';
      if (reasonLower.includes('hand')) cat = 'hand';
      else if (reasonLower.includes('crib')) cat = 'crib';

      if (log.player === 1) {
        if (cat === 'pegging') breakdown.p1.pegging += log.delta;
        else if (cat === 'hand') breakdown.p1.hand += log.delta;
        else if (cat === 'crib') breakdown.p1.crib += log.delta;
      } else if (log.player === 2) {
        if (cat === 'pegging') breakdown.p2.pegging += log.delta;
        else if (cat === 'hand') breakdown.p2.hand += log.delta;
        else if (cat === 'crib') breakdown.p2.crib += log.delta;
      } else if (log.player === 3) {
        if (cat === 'pegging') breakdown.p3.pegging += log.delta;
        else if (cat === 'hand') breakdown.p3.hand += log.delta;
        else if (cat === 'crib') breakdown.p3.crib += log.delta;
      } else if (log.player === 4) {
        if (cat === 'pegging') breakdown.p4.pegging += log.delta;
        else if (cat === 'hand') breakdown.p4.hand += log.delta;
        else if (cat === 'crib') breakdown.p4.crib += log.delta;
      }
    }

    return breakdown;
  }

  public formatDuration(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  public calculateStats(playerName: string): PlayerStats {
    const stats: PlayerStats = {
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      skunkWins: 0,
      doubleSkunkWins: 0,
      skunkLosses: 0,
      doubleSkunkLosses: 0,
      avgScore: 0,
      avgPegging: 0,
      avgHand: 0,
      avgCrib: 0,
      avgOpponentScore: 0,
      avgOpponentPegging: 0,
      avgOpponentHand: 0,
      avgOpponentCrib: 0
    };

    const games = this.historyList.filter(g => {
      const hasPlayer = g.player1Name === playerName ||
                        g.player2Name === playerName ||
                        g.player3Name === playerName ||
                        g.player4Name === playerName;
      
      if (!hasPlayer) return false;
      
      const gameMode = g.mode || 2;
      if (this.statsModeFilter === 'all') return true;
      return gameMode === +this.statsModeFilter;
    });

    if (games.length === 0) return stats;

    stats.gamesPlayed = games.length;
    let totalScore = 0;
    let totalTeamScore = 0;
    let totalPegging = 0;
    let totalTeamPegging = 0;
    let totalHand = 0;
    let totalTeamHand = 0;
    let totalCrib = 0;
    let totalTeamCrib = 0;
    let totalOpponentScore = 0;
    let totalOpponentPegging = 0;
    let totalOpponentHand = 0;
    let totalOpponentCrib = 0;

    for (const game of games) {
      const gameMode = game.mode || 2;
      
      let ownIndex = 1;
      if (game.player1Name === playerName) ownIndex = 1;
      else if (game.player2Name === playerName) ownIndex = 2;
      else if (game.player3Name === playerName) ownIndex = 3;
      else if (game.player4Name === playerName) ownIndex = 4;

      let isWinner = false;
      let oppScore = 0;
      let ownScore = 0; // team score in 4p, own score in 2p/3p
      let ownIndivScore = 0;

      const actualScores: { [playerNum: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0 };
      for (const log of game.scoreLogs) {
        if (log.player >= 1 && log.player <= 4) {
          actualScores[log.player] += log.delta;
        }
      }

      if (gameMode === 3) {
        isWinner = game.winner === ownIndex;
        ownScore = actualScores[ownIndex];
        ownIndivScore = ownScore;
        const otherScores = [1, 2, 3].filter(idx => idx !== ownIndex).map(idx => actualScores[idx]);
        oppScore = Math.max(...otherScores);
      } else if (gameMode === 4) {
        const ownTeam = (ownIndex === 1 || ownIndex === 3) ? 1 : 2;
        isWinner = game.winner === ownTeam;
        ownScore = ownTeam === 1 ? (actualScores[1] + actualScores[3]) : (actualScores[2] + actualScores[4]);
        ownIndivScore = actualScores[ownIndex];
        oppScore = ownTeam === 1 ? (actualScores[2] + actualScores[4]) : (actualScores[1] + actualScores[3]);
      } else {
        isWinner = game.winner === ownIndex;
        ownScore = actualScores[ownIndex];
        ownIndivScore = ownScore;
        oppScore = actualScores[ownIndex === 1 ? 2 : 1];
      }

      totalScore += ownIndivScore;
      totalTeamScore += ownScore;

      if (isWinner) {
        stats.wins++;
        if (oppScore < 61) {
          stats.doubleSkunkWins++;
        } else if (oppScore < 91) {
          stats.skunkWins++;
        }
      } else {
        stats.losses++;
        if (ownScore < 61) {
          stats.doubleSkunkLosses++;
        } else if (ownScore < 91) {
          stats.skunkLosses++;
        }
      }

      totalOpponentScore += oppScore;

      let ownPeg = 0, ownHand = 0, ownCrib = 0;
      let teammatePeg = 0, teammateHand = 0, teammateCrib = 0;
      let oppPeg = 0, oppHand = 0, oppCrib = 0;

      const teammateIndex = ownIndex === 1 ? 3 : (ownIndex === 3 ? 1 : (ownIndex === 2 ? 4 : 2));

      for (const log of game.scoreLogs) {
        const reasonLower = log.reason.toLowerCase();
        let cat: 'pegging' | 'hand' | 'crib' = 'pegging';
        if (reasonLower.includes('hand')) cat = 'hand';
        else if (reasonLower.includes('crib')) cat = 'crib';

        if (log.player === ownIndex) {
          if (cat === 'pegging') ownPeg += log.delta;
          else if (cat === 'hand') ownHand += log.delta;
          else if (cat === 'crib') ownCrib += log.delta;
        } else if (gameMode === 4 && log.player === teammateIndex) {
          if (cat === 'pegging') teammatePeg += log.delta;
          else if (cat === 'hand') teammateHand += log.delta;
          else if (cat === 'crib') teammateCrib += log.delta;
        } else {
          if (gameMode === 4) {
            const logTeam = (log.player === 1 || log.player === 3) ? 1 : 2;
            const ownTeam = (ownIndex === 1 || ownIndex === 3) ? 1 : 2;
            if (logTeam !== ownTeam) {
              if (cat === 'pegging') oppPeg += log.delta;
              else if (cat === 'hand') oppHand += log.delta;
              else if (cat === 'crib') oppCrib += log.delta;
            }
          } else {
            if (cat === 'pegging') oppPeg += log.delta;
            else if (cat === 'hand') oppHand += log.delta;
            else if (cat === 'crib') oppCrib += log.delta;
          }
        }
      }

      totalPegging += ownPeg;
      totalHand += ownHand;
      totalCrib += ownCrib;

      if (gameMode === 4) {
        totalTeamPegging += (ownPeg + teammatePeg);
        totalTeamHand += (ownHand + teammateHand);
        totalTeamCrib += (ownCrib + teammateCrib);
      }

      if (gameMode === 3) {
        totalOpponentPegging += oppPeg / 2;
        totalOpponentHand += oppHand / 2;
        totalOpponentCrib += oppCrib / 2;
      } else {
        totalOpponentPegging += oppPeg;
        totalOpponentHand += oppHand;
        totalOpponentCrib += oppCrib;
      }
    }

    stats.winRate = Math.round((stats.wins / stats.gamesPlayed) * 100);
    stats.avgScore = Math.round((totalScore / stats.gamesPlayed) * 10) / 10;
    stats.avgPegging = Math.round((totalPegging / stats.gamesPlayed) * 10) / 10;
    stats.avgHand = Math.round((totalHand / stats.gamesPlayed) * 10) / 10;
    stats.avgCrib = Math.round((totalCrib / stats.gamesPlayed) * 10) / 10;

    if (this.statsModeFilter === '4' || (this.statsModeFilter === 'all' && games.some(g => (g.mode || 2) === 4))) {
      stats.avgTeamScore = Math.round((totalTeamScore / stats.gamesPlayed) * 10) / 10;
      stats.avgTeamPegging = Math.round((totalTeamPegging / stats.gamesPlayed) * 10) / 10;
      stats.avgTeamHand = Math.round((totalTeamHand / stats.gamesPlayed) * 10) / 10;
      stats.avgTeamCrib = Math.round((totalTeamCrib / stats.gamesPlayed) * 10) / 10;
    }

    stats.avgOpponentScore = Math.round((totalOpponentScore / stats.gamesPlayed) * 10) / 10;
    stats.avgOpponentPegging = Math.round((totalOpponentPegging / stats.gamesPlayed) * 10) / 10;
    stats.avgOpponentHand = Math.round((totalOpponentHand / stats.gamesPlayed) * 10) / 10;
    stats.avgOpponentCrib = Math.round((totalOpponentCrib / stats.gamesPlayed) * 10) / 10;

    return stats;
  }
}
