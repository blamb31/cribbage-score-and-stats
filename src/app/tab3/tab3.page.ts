import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonSegment, IonSegmentButton, 
  IonSelect, IonSelectOption, IonList, IonItem, IonLabel, IonNote, IonIcon, 
  IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonRow, IonCol,
  IonModal, IonCheckbox, IonButtons
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  chevronDownOutline, chevronUpOutline, trashOutline, trophyOutline, 
  timeOutline, calendarOutline, barChartOutline, analyticsOutline,
  createOutline, personRemoveOutline, downloadOutline, cloudUploadOutline,
  checkboxOutline, checkmarkCircleOutline, closeOutline, listOutline,
  checkmarkOutline, cloudDoneOutline, cloudOfflineOutline, mailOutline,
  lockClosedOutline, cloudDownloadOutline, settingsOutline, eyeOffOutline
} from 'ionicons/icons';
import { GameService, CompletedGame, PlayerProfile } from '../services/game.service';
import { OnboardingService } from '../services/onboarding.service';
import { SupabaseService } from '../services/supabase.service';
import { Subscription } from 'rxjs';
import { User } from '@supabase/supabase-js';

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

export interface PlayerMapping {
  uploadedName: string;
  mapType: 'existing' | 'new';
  selectedExistingId: string;
  newPlayerName: string;
}

export interface PlayerMergeMapping {
  localId: string;
  localName: string;
  mapType: 'existing' | 'new';
  selectedExistingId: string;
  newName: string;
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
    IonModal, IonCheckbox, IonButtons
]
})
export class Tab3Page implements OnInit, OnDestroy {
  public activeSegment: 'stats' | 'history' = 'stats';
  
  public playersList: PlayerProfile[] = [];
  public historyList: CompletedGame[] = [];
  public selectedPlayerId = '';
  
  public activeStats!: PlayerStats;
  public expandedGameIds = new Set<string>();
  public showDeleteConfirm = false;
  public gameIdToDelete: string | null = null;
  public showEditPlayerModal = false;
  public editPlayerName = '';
  public showDeletePlayerModal = false;
  public statsModeFilter: 'all' | '2' | '3' | '4' = '2';

  public isSelectionMode = false;
  public selectedGameIds = new Set<string>();
  public showUploadMappingModal = false;
  public uploadedGames: CompletedGame[] = [];
  public uploadMappings: PlayerMapping[] = [];

  // Cloud auth properties
  public showCloudModal = false;
  public cloudMode: 'signup' | 'signin' | 'forgot' | 'reset' = 'signup';
  public cloudEmail = '';
  public cloudPassword = '';
  public cloudConfirmPassword = '';
  public currentUser: User | null = null;

  // Syncing and Error properties
  public syncStatusMessage = '';
  public syncStatusType: 'success' | 'error' | '' = '';
  public editPlayerErrorMessage = '';
  public mappingErrorMessage = '';

  // Game Settings and Bulk Action properties
  public showGameSettingsModal = false;
  public selectedGameForSettings: CompletedGame | null = null;
  public showBulkDeleteConfirm = false;

  // Player Merge properties
  public showMergeModal = false;
  public mergeMappings: PlayerMergeMapping[] = [];
  public localMergePlayers: PlayerProfile[] = [];
  public cloudMergePlayers: PlayerProfile[] = [];
  public mergeErrorMessage = '';

  private playersSub!: Subscription;
  private historySub!: Subscription;
  private userSub!: Subscription;
  private mergeSub!: Subscription;
  private recoverySub!: Subscription;

  constructor(
    public gameService: GameService,
    public onboardingService: OnboardingService,
    public supabaseService: SupabaseService
  ) {
    addIcons({
      chevronDownOutline, chevronUpOutline, trashOutline, trophyOutline, 
      timeOutline, calendarOutline, barChartOutline, analyticsOutline,
      createOutline, personRemoveOutline, downloadOutline, cloudUploadOutline,
      checkboxOutline, checkmarkCircleOutline, closeOutline, listOutline,
      checkmarkOutline, cloudDoneOutline, cloudOfflineOutline, mailOutline,
      lockClosedOutline, cloudDownloadOutline, settingsOutline, eyeOffOutline
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

    this.userSub = this.supabaseService.user$.subscribe(user => {
      this.currentUser = user;
    });

    this.recoverySub = this.supabaseService.passwordRecovery$.subscribe(recovery => {
      if (recovery) {
        this.cloudMode = 'reset';
        this.cloudEmail = '';
        this.cloudPassword = '';
        this.cloudConfirmPassword = '';
        this.cloudErrorMessage = '';
        this.cloudSuccessMessage = '';
        this.showCloudModal = true;
      }
    });
    this.mergeSub = this.gameService.pendingMergePlayers$.subscribe(mergeState => {
      if (mergeState) {
        this.localMergePlayers = mergeState.local;
        this.cloudMergePlayers = mergeState.cloud;
        
        // Initialize mappings: auto-map to same name if exists, otherwise default to "new"
        this.mergeMappings = this.localMergePlayers.map(lp => {
          const similarCloud = this.cloudMergePlayers.find(cp => cp.name.toLowerCase() === lp.name.toLowerCase());
          return {
            localId: lp.id,
            localName: lp.name,
            mapType: similarCloud ? 'existing' as const : 'new' as const,
            selectedExistingId: similarCloud ? similarCloud.id : (this.cloudMergePlayers.length > 0 ? this.cloudMergePlayers[0].id : ''),
            newName: lp.name
          };
        });
        
        this.showMergeModal = true;
      } else {
        this.showMergeModal = false;
      }
    });
  }

  ngOnDestroy() {
    if (this.playersSub) this.playersSub.unsubscribe();
    if (this.historySub) this.historySub.unsubscribe();
    if (this.userSub) this.userSub.unsubscribe();
    if (this.mergeSub) this.mergeSub.unsubscribe();
    if (this.recoverySub) this.recoverySub.unsubscribe();
  }

  // Cloud Actions
  public cloudErrorMessage = '';
  public showEmailVerifyNotice = false;

  public openCloudModal() {
    this.cloudEmail = '';
    this.cloudPassword = '';
    this.cloudConfirmPassword = '';
    this.cloudErrorMessage = '';
    this.cloudSuccessMessage = '';
    this.showEmailVerifyNotice = false;

    // Reset cloudMode back to standard sign-in if we are not actively recovering
    if (this.cloudMode === 'reset' && !this.supabaseService.passwordRecovery$.value) {
      this.cloudMode = 'signin';
    }
    if (this.cloudMode === 'forgot') {
      this.cloudMode = 'signin';
    }
    this.showCloudModal = true;
  }

  public switchToSignIn() {
    this.showEmailVerifyNotice = false;
    this.cloudMode = 'signin';
    this.cloudPassword = '';
    this.cloudConfirmPassword = '';
    this.cloudErrorMessage = '';
    this.cloudSuccessMessage = '';
  }

  public switchToForgot() {
    this.showEmailVerifyNotice = false;
    this.cloudMode = 'forgot';
    this.cloudPassword = '';
    this.cloudConfirmPassword = '';
    this.cloudErrorMessage = '';
    this.cloudSuccessMessage = '';
  }

  public async sendResetEmail() {
    if (!this.cloudEmail.trim()) {
      this.cloudErrorMessage = 'Please enter your email address';
      return;
    }
    this.cloudErrorMessage = '';
    this.cloudSuccessMessage = '';

    try {
      await this.supabaseService.sendPasswordResetEmail(this.cloudEmail.trim());
      this.cloudSuccessMessage = 'Reset link sent! Please check your email inbox.';
    } catch (e: any) {
      this.cloudErrorMessage = e.message || 'Failed to send reset email';
    }
  }

  public async resetPassword() {
    if (!this.cloudPassword.trim()) {
      this.cloudErrorMessage = 'Please enter a new password';
      return;
    }
    if (this.cloudPassword.trim().length < 6) {
      this.cloudErrorMessage = 'Password must be at least 6 characters long';
      return;
    }
    if (this.cloudPassword !== this.cloudConfirmPassword) {
      this.cloudErrorMessage = 'Passwords do not match';
      return;
    }
    this.cloudErrorMessage = '';
    this.cloudSuccessMessage = '';

    try {
      await this.supabaseService.updatePassword(this.cloudPassword.trim());
      this.cloudSuccessMessage = 'Password updated successfully!';
      // Reset state and clear recovery trigger
      this.supabaseService.passwordRecovery$.next(false);
      // Reset cloud mode to signin for subsequent manual opens
      this.cloudMode = 'signin';
      setTimeout(() => {
        this.showCloudModal = false;
        this.cloudSuccessMessage = '';
      }, 2000);
    } catch (e: any) {
      this.cloudErrorMessage = e.message || 'Failed to update password';
    }
  }

  public async onCloudAction() {
    if (!this.cloudEmail.trim() || !this.cloudPassword.trim()) {
      this.cloudErrorMessage = 'Please enter your email and password';
      return;
    }
    this.cloudErrorMessage = '';

    try {
      if (this.cloudMode === 'signup') {
        await this.supabaseService.signUp(this.cloudEmail.trim(), this.cloudPassword.trim());
        // Switch to showing the verification message inside the modal
        this.showEmailVerifyNotice = true;
      } else {
        await this.supabaseService.signIn(this.cloudEmail.trim(), this.cloudPassword.trim());
        
        // Auto-sync local storage to the database immediately upon login
        try {
          const syncResult = await this.supabaseService.syncLocalStorageToSupabase();
          console.log(`Auto-sync complete: synced ${syncResult.playersSynced} players and ${syncResult.gamesSynced} games.`);
        } catch (syncErr) {
          console.warn('Auto-sync failed on auth action:', syncErr);
        }
        
        this.showCloudModal = false;
      }
    } catch (e: any) {
      this.cloudErrorMessage = e.message || 'Authentication failed';
    }
  }

  public cloudSuccessMessage = '';

  public async onSignOut() {
    this.cloudErrorMessage = '';
    this.cloudSuccessMessage = '';
    try {
      await this.supabaseService.signOut();
      this.showCloudModal = false;
    } catch (e: any) {
      this.cloudErrorMessage = e.message || 'Logout failed';
    }
  }

  public async triggerManualSync() {
    this.cloudErrorMessage = '';
    this.cloudSuccessMessage = '';
    try {
      const res = await this.supabaseService.syncLocalStorageToSupabase();
      this.cloudSuccessMessage = `Synced ${res.playersSynced} players and ${res.gamesSynced} games to the cloud!`;
    } catch (e: any) {
      this.cloudErrorMessage = e.message || 'Sync failed';
    }
  }

  public onPlayerChange() {
    this.updateSelectedPlayerStats();
  }

  public toggleExpandGame(gameId: string) {
    if (this.expandedGameIds.has(gameId)) {
      this.expandedGameIds.delete(gameId);
    } else {
      this.expandedGameIds.add(gameId);
    }
  }

  public isGameExpanded(gameId: string): boolean {
    return this.expandedGameIds.has(gameId);
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

  public openGameSettings(game: CompletedGame, event: Event) {
    event.stopPropagation();
    this.selectedGameForSettings = game;
    this.showGameSettingsModal = true;
  }

  public toggleGameStatsInclusion(game: CompletedGame) {
    const isExcluded = !game.excluded;
    this.gameService.updateGameStatsInclusion(game.id, isExcluded);
    // Refresh UI/statistics references
    this.updateSelectedPlayerStats();
  }

  public deleteSelectedGames() {
    if (this.selectedGameIds.size === 0) return;
    const ids = Array.from(this.selectedGameIds);
    this.gameService.deleteGamesFromHistory(ids);
    this.selectedGameIds.clear();
    this.isSelectionMode = false;
    this.showBulkDeleteConfirm = false;
    this.updateSelectedPlayerStats();
  }

  public bulkStatsInclusion(exclude: boolean) {
    if (this.selectedGameIds.size === 0) return;
    const ids = Array.from(this.selectedGameIds);
    this.gameService.updateGamesStatsInclusion(ids, exclude);
    this.selectedGameIds.clear();
    this.isSelectionMode = false;
    this.updateSelectedPlayerStats();
  }

  public get unsyncedGamesCount(): number {
    return this.historyList.filter(g => !g.synced).length;
  }

  public async uploadUnsynced() {
    this.syncStatusMessage = '';
    this.syncStatusType = '';
    try {
      const count = await this.gameService.uploadUnsyncedGames();
      if (count > 0) {
        this.syncStatusType = 'success';
        this.syncStatusMessage = `Successfully uploaded ${count} game${count === 1 ? '' : 's'} to the cloud!`;
      } else {
        this.syncStatusType = 'success';
        this.syncStatusMessage = 'All games are already uploaded and synced.';
      }
      setTimeout(() => {
        if (this.syncStatusMessage.includes('Successfully') || this.syncStatusMessage.includes('already')) {
          this.syncStatusMessage = '';
        }
      }, 4000);
    } catch (e: any) {
      this.syncStatusType = 'error';
      this.syncStatusMessage = e.message || 'Failed to upload unsynced games.';
    }
  }

  public openEditPlayerModal() {
    this.editPlayerName = this.getSelectedPlayerName();
    this.editPlayerErrorMessage = '';
    this.showEditPlayerModal = true;
  }

  public savePlayerName() {
    if (!this.editPlayerName.trim()) return;
    this.editPlayerErrorMessage = '';
    try {
      this.gameService.updatePlayerName(this.selectedPlayerId, this.editPlayerName);
      this.showEditPlayerModal = false;
      this.updateSelectedPlayerStats();
    } catch (e: any) {
      this.editPlayerErrorMessage = e.message || 'Error updating player name';
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
      if (g.excluded) return false;

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

  // --- Selection Mode Actions ---
  public toggleSelectionMode() {
    this.isSelectionMode = !this.isSelectionMode;
    this.selectedGameIds.clear();
  }

  public toggleSelectGame(id: string) {
    if (this.selectedGameIds.has(id)) {
      this.selectedGameIds.delete(id);
    } else {
      this.selectedGameIds.add(id);
    }
  }

  public isGameSelected(id: string): boolean {
    return this.selectedGameIds.has(id);
  }

  public selectAllGames() {
    this.historyList.forEach(g => this.selectedGameIds.add(g.id));
  }

  public clearSelectedGames() {
    this.selectedGameIds.clear();
  }

  // --- Download Game Actions ---
  public downloadSingleGame(game: CompletedGame, event: Event) {
    event.stopPropagation();
    const filename = `cribbage_game_${game.id || Date.now()}_${new Date(game.date).toISOString().split('T')[0]}.json`;
    this.downloadJSON(game, filename);
  }

  public downloadSelectedGames() {
    if (this.selectedGameIds.size === 0) return;
    const gamesToDownload = this.historyList.filter(g => this.selectedGameIds.has(g.id));
    const filename = `cribbage_games_export_${Date.now()}.json`;
    this.downloadJSON(gamesToDownload, filename);
    this.isSelectionMode = false;
    this.selectedGameIds.clear();
  }

  private downloadJSON(data: any, filename: string) {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  // --- Upload Game Actions ---
  public triggerFileUpload() {
    const fileInput = document.getElementById('upload-game-file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  public onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      this.syncStatusMessage = '';
      this.syncStatusType = '';
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        
        let games: CompletedGame[] = [];
        if (Array.isArray(parsed)) {
          games = parsed;
        } else if (parsed && typeof parsed === 'object' && parsed.player1Name && parsed.player2Name) {
          games = [parsed];
        } else {
          throw new Error('Invalid cribbage game file schema');
        }

        // Validate basic schema
        for (const g of games) {
          if (!g.player1Name || !g.player2Name || g.player1Score === undefined || g.player2Score === undefined) {
            throw new Error('Some games are missing required player name or score fields');
          }
        }

        this.uploadedGames = games;
        this.setupPlayerMappings();
      } catch (err: any) {
        this.syncStatusType = 'error';
        this.syncStatusMessage = err.message || 'Failed to parse JSON file.';
      } finally {
        input.value = '';
      }
    };
    reader.readAsText(file);
  }

  private setupPlayerMappings() {
    this.mappingErrorMessage = '';
    const uniqueNames = new Set<string>();
    this.uploadedGames.forEach(g => {
      if (g.player1Name) uniqueNames.add(g.player1Name);
      if (g.player2Name) uniqueNames.add(g.player2Name);
      if (g.player3Name) uniqueNames.add(g.player3Name);
      if (g.player4Name) uniqueNames.add(g.player4Name);
    });

    const mappings: PlayerMapping[] = [];
    uniqueNames.forEach(name => {
      const existing = this.playersList.find(p => p.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        mappings.push({
          uploadedName: name,
          mapType: 'existing',
          selectedExistingId: existing.id,
          newPlayerName: name
        });
      } else {
        mappings.push({
          uploadedName: name,
          mapType: 'new',
          selectedExistingId: this.playersList.length > 0 ? this.playersList[0].id : '',
          newPlayerName: name
        });
      }
    });

    this.uploadMappings = mappings;
    this.showUploadMappingModal = true;
  }

  public confirmImport() {
    this.mappingErrorMessage = '';
    for (const mapping of this.uploadMappings) {
      if (mapping.mapType === 'new') {
        const newName = mapping.newPlayerName.trim();
        if (!newName) {
          this.mappingErrorMessage = 'Player names cannot be empty';
          return;
        }
      }
    }

    try {
      const nameToProfileMap = new Map<string, string>();

      for (const mapping of this.uploadMappings) {
        if (mapping.mapType === 'new') {
          const targetName = mapping.newPlayerName.trim();
          const existing = this.playersList.find(p => p.name.toLowerCase() === targetName.toLowerCase());
          if (existing) {
            nameToProfileMap.set(mapping.uploadedName, existing.name);
          } else {
            const newP = this.gameService.createPlayer(targetName);
            nameToProfileMap.set(mapping.uploadedName, newP.name);
          }
        } else {
          const existing = this.playersList.find(p => p.id === mapping.selectedExistingId);
          if (existing) {
            nameToProfileMap.set(mapping.uploadedName, existing.name);
          } else {
            nameToProfileMap.set(mapping.uploadedName, mapping.uploadedName);
          }
        }
      }

      const mappedGames = this.uploadedGames.map(game => {
        return {
          ...game,
          player1Name: nameToProfileMap.get(game.player1Name) || game.player1Name,
          player2Name: nameToProfileMap.get(game.player2Name) || game.player2Name,
          player3Name: game.player3Name ? (nameToProfileMap.get(game.player3Name) || game.player3Name) : undefined,
          player4Name: game.player4Name ? (nameToProfileMap.get(game.player4Name) || game.player4Name) : undefined
        };
      });

      this.gameService.importCompletedGames(mappedGames);
      this.showUploadMappingModal = false;
      this.uploadedGames = [];
      this.uploadMappings = [];
      
      this.syncStatusType = 'success';
      this.syncStatusMessage = `Successfully imported ${mappedGames.length} games!`;
      setTimeout(() => {
        if (this.syncStatusMessage.includes('Successfully imported')) {
          this.syncStatusMessage = '';
        }
      }, 4000);
    } catch (e: any) {
      this.mappingErrorMessage = e.message || 'Error occurred during import.';
    }
  }

  public async confirmPlayerMerge() {
    this.mergeErrorMessage = '';
    // Validation
    for (const mapping of this.mergeMappings) {
      if (mapping.mapType === 'new') {
        if (!mapping.newName.trim()) {
          this.mergeErrorMessage = 'Player names cannot be empty';
          return;
        }
      }
    }

    try {
      const payload = this.mergeMappings.map(m => ({
        localId: m.localId,
        mapType: m.mapType,
        targetPlayerId: m.mapType === 'existing' ? m.selectedExistingId : undefined,
        newName: m.mapType === 'new' ? m.newName : undefined
      }));
      
      await this.gameService.completePlayerMerge(payload);
      this.showMergeModal = false;
    } catch (e: any) {
      this.mergeErrorMessage = e.message || 'Failed to merge players.';
    }
  }
}
