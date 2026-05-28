import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameService, GameState, ScoreLog, PlayerProfile } from '../services/game.service';
import { Subscription } from 'rxjs';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonGrid, IonRow, IonCol, 
  IonButton, IonIcon, IonCard, IonCardContent, IonCardHeader, IonCardTitle,
  IonItem, IonLabel, IonInput, IonModal, IonList, IonNote, IonSegment, IonSegmentButton, IonListHeader,
  IonButtons, IonSelect, IonSelectOption
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  playOutline, refreshOutline, arrowUndoOutline, arrowRedoOutline, 
  personOutline, trophyOutline, textOutline, bookmarkOutline, addOutline,
  closeOutline, personAddOutline, checkmarkCircleOutline, trashOutline,
  settingsOutline, swapHorizontalOutline
} from 'ionicons/icons';

@Component({
    selector: 'app-tab1',
    templateUrl: 'tab1.page.html',
    styleUrls: ['tab1.page.scss'],
    imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonGrid,
    IonRow,
    IonCol,
    IonButton,
    IonIcon,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonItem,
    IonLabel,
    IonInput,
    IonModal,
    IonList,
    IonNote,
    IonSegment,
    IonSegmentButton,
    IonListHeader,
    IonButtons,
    IonSelect,
    IonSelectOption
]
})
export class Tab1Page implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('pegboardCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  
  public gameState!: GameState;
  private gameSub!: Subscription;
  private playersSub!: Subscription;

  // New Game Setup fields
  public showSetupModal = false;
  public showResetConfirm = false;
  public playersList: PlayerProfile[] = [];
  public selectedP1Id = '';
  public selectedP2Id = '';
  public selectedP3Id = '';
  public selectedP4Id = '';
  
  // Game mode setup: 2, 3, or 4 players
  public setupMode: 2 | 3 | 4 = 2;

  // Create player form states
  public showP1CreateForm = false;
  public showP2CreateForm = false;
  public showP3CreateForm = false;
  public showP4CreateForm = false;
  public newP1Name = '';
  public newP2Name = '';
  public newP3Name = '';
  public newP4Name = '';

  // Staged Score state
  public p1StagedScore = 0;
  public p2StagedScore = 0;
  public p1Category: 'Pegging' | 'Hand' | 'Crib' = 'Pegging';
  public p2Category: 'Pegging' | 'Hand' | 'Crib' = 'Pegging';

  // Active scorers for 3 and 4 players
  public activeThreePlayerScorer: 1 | 2 | 3 = 1;
  public p1ActiveScorer: 1 | 3 = 1;
  public p2ActiveScorer: 2 | 4 = 2;

  // Scoring Input fields (legacy reference compatibility)
  public scoringPlayer: number = 1;
  public scoreReason = 'Pegging';
  public customScoreInput = 0;

  // Custom quick score list
  public quickScores = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24];

  // Animation values for pegs
  private animScore1 = 0;
  private animScore2 = 0;
  private animScore3 = 0;
  private animationFrameId: number | null = null;

  constructor(public gameService: GameService) {
    addIcons({
      playOutline, refreshOutline, arrowUndoOutline, arrowRedoOutline,
      personOutline, trophyOutline, textOutline, bookmarkOutline, addOutline,
      closeOutline, personAddOutline, checkmarkCircleOutline, trashOutline,
      settingsOutline, swapHorizontalOutline
    });
  }

  ngOnInit() {
    this.gameSub = this.gameService.gameState$.subscribe(state => {
      this.gameState = state;
      
      // If a game just became active and scores are 0, reset animations
      if (state.isActive && state.player1.score === 0 && state.player2.score === 0) {
        this.animScore1 = 0;
        this.animScore2 = 0;
        this.animScore3 = 0;
      }

      // Trigger board redraw with peg animations
      if (this.canvasRef) {
        this.animatePegs();
      }
    });

    this.playersSub = this.gameService.players$.subscribe(list => {
      this.playersList = list;
      // Auto-select distinct players if not already set
      if (list.length >= 1 && !this.selectedP1Id) {
        this.selectedP1Id = list[0].id;
      }
      if (list.length >= 2 && !this.selectedP2Id) {
        this.selectedP2Id = list[1].id;
      } else if (list.length === 1 && !this.selectedP2Id) {
        this.selectedP2Id = list[0].id;
      }
      if (list.length >= 3 && !this.selectedP3Id) {
        this.selectedP3Id = list[2].id;
      } else if (list.length > 0 && !this.selectedP3Id) {
        this.selectedP3Id = list[0].id;
      }
      if (list.length >= 4 && !this.selectedP4Id) {
        this.selectedP4Id = list[3].id;
      } else if (list.length > 0 && !this.selectedP4Id) {
        this.selectedP4Id = list[0].id;
      }
    });
  }

  ngAfterViewInit() {
    // Set initial size and draw
    this.resizeCanvas();
    this.animatePegs();

    // Resize listener for canvas responsiveness
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  ngOnDestroy() {
    if (this.gameSub) this.gameSub.unsubscribe();
    if (this.playersSub) this.playersSub.unsubscribe();
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', () => this.resizeCanvas());
  }

  public openSetupModal() {
    this.showSetupModal = true;
  }

  public createPlayerInline(playerNum: 1 | 2 | 3 | 4) {
    const name = playerNum === 1 ? this.newP1Name : (playerNum === 2 ? this.newP2Name : (playerNum === 3 ? this.newP3Name : this.newP4Name));
    try {
      const p = this.gameService.createPlayer(name);
      if (playerNum === 1) {
        this.selectedP1Id = p.id;
        this.newP1Name = '';
        this.showP1CreateForm = false;
      } else if (playerNum === 2) {
        this.selectedP2Id = p.id;
        this.newP2Name = '';
        this.showP2CreateForm = false;
      } else if (playerNum === 3) {
        this.selectedP3Id = p.id;
        this.newP3Name = '';
        this.showP3CreateForm = false;
      } else {
        this.selectedP4Id = p.id;
        this.newP4Name = '';
        this.showP4CreateForm = false;
      }
    } catch (e: any) {
      alert(e.message || 'Error creating player');
    }
  }

  get isValidSetup(): boolean {
    const p1Selected = this.showP1CreateForm ? this.newP1Name.trim().length > 0 : !!this.selectedP1Id;
    const p2Selected = this.showP2CreateForm ? this.newP2Name.trim().length > 0 : !!this.selectedP2Id;
    
    if (this.setupMode === 2) {
      const distinct = this.showP1CreateForm || this.showP2CreateForm || (this.selectedP1Id !== this.selectedP2Id);
      return p1Selected && p2Selected && distinct;
    }
    
    const p3Selected = this.showP3CreateForm ? this.newP3Name.trim().length > 0 : !!this.selectedP3Id;
    if (this.setupMode === 3) {
      const p1Name = this.showP1CreateForm ? this.newP1Name.trim() : this.playersList.find(x => x.id === this.selectedP1Id)?.name || '';
      const p2Name = this.showP2CreateForm ? this.newP2Name.trim() : this.playersList.find(x => x.id === this.selectedP2Id)?.name || '';
      const p3Name = this.showP3CreateForm ? this.newP3Name.trim() : this.playersList.find(x => x.id === this.selectedP3Id)?.name || '';
      
      const names = [p1Name.toLowerCase(), p2Name.toLowerCase(), p3Name.toLowerCase()].filter(Boolean);
      const distinct = new Set(names).size === names.length;
      return p1Selected && p2Selected && p3Selected && distinct && names.length === 3;
    }
    
    const p4Selected = this.showP4CreateForm ? this.newP4Name.trim().length > 0 : !!this.selectedP4Id;
    if (this.setupMode === 4) {
      const p1Name = this.showP1CreateForm ? this.newP1Name.trim() : this.playersList.find(x => x.id === this.selectedP1Id)?.name || '';
      const p2Name = this.showP2CreateForm ? this.newP2Name.trim() : this.playersList.find(x => x.id === this.selectedP2Id)?.name || '';
      const p3Name = this.showP3CreateForm ? this.newP3Name.trim() : this.playersList.find(x => x.id === this.selectedP3Id)?.name || '';
      const p4Name = this.showP4CreateForm ? this.newP4Name.trim() : this.playersList.find(x => x.id === this.selectedP4Id)?.name || '';
      
      const names = [p1Name.toLowerCase(), p2Name.toLowerCase(), p3Name.toLowerCase(), p4Name.toLowerCase()].filter(Boolean);
      const distinct = new Set(names).size === names.length;
      return p1Selected && p2Selected && p3Selected && p4Selected && distinct && names.length === 4;
    }
    
    return false;
  }

  public startNewGame() {
    if (!this.isValidSetup) return;

    let p1Name = '';
    let p2Name = '';
    let p3Name = '';
    let p4Name = '';

    // Player 1
    if (this.showP1CreateForm && this.newP1Name.trim()) {
      const p = this.gameService.createPlayer(this.newP1Name);
      p1Name = p.name;
      this.selectedP1Id = p.id;
      this.newP1Name = '';
      this.showP1CreateForm = false;
    } else {
      const p = this.playersList.find(x => x.id === this.selectedP1Id);
      p1Name = p ? p.name : 'Player 1';
    }

    // Player 2
    if (this.showP2CreateForm && this.newP2Name.trim()) {
      const p = this.gameService.createPlayer(this.newP2Name);
      p2Name = p.name;
      this.selectedP2Id = p.id;
      this.newP2Name = '';
      this.showP2CreateForm = false;
    } else {
      const p = this.playersList.find(x => x.id === this.selectedP2Id);
      p2Name = p ? p.name : 'Player 2';
    }

    // Player 3
    if (this.setupMode >= 3) {
      if (this.showP3CreateForm && this.newP3Name.trim()) {
        const p = this.gameService.createPlayer(this.newP3Name);
        p3Name = p.name;
        this.selectedP3Id = p.id;
        this.newP3Name = '';
        this.showP3CreateForm = false;
      } else {
        const p = this.playersList.find(x => x.id === this.selectedP3Id);
        p3Name = p ? p.name : 'Player 3';
      }
    }

    // Player 4
    if (this.setupMode === 4) {
      if (this.showP4CreateForm && this.newP4Name.trim()) {
        const p = this.gameService.createPlayer(this.newP4Name);
        p4Name = p.name;
        this.selectedP4Id = p.id;
        this.newP4Name = '';
        this.showP4CreateForm = false;
      } else {
        const p = this.playersList.find(x => x.id === this.selectedP4Id);
        p4Name = p ? p.name : 'Player 4';
      }
    }

    this.gameService.startNewGame(p1Name, p2Name, this.setupMode, p3Name, p4Name);
    this.p1StagedScore = 0;
    this.p2StagedScore = 0;
    this.p1Category = 'Pegging';
    this.p2Category = 'Pegging';
    
    this.activeThreePlayerScorer = 1;
    this.p1ActiveScorer = 1;
    this.p2ActiveScorer = 2;
    this.showSetupModal = false;
  }

  // --- Staged Scoring Controls ---
  public addStagedScore(playerNum: number, points: number) {
    if (playerNum === 1) {
      this.p1StagedScore += points;
    } else {
      this.p2StagedScore += points;
    }
  }

  public clearStagedScore(playerNum: number) {
    if (playerNum === 1) {
      this.p1StagedScore = 0;
    } else {
      this.p2StagedScore = 0;
    }
  }

  public submitScore(side: 1 | 2) {
    if (this.gameState.mode === 3) {
      const points = this.p1StagedScore;
      const category = this.p1Category;
      if (points > 0) {
        this.gameService.addPoints(this.activeThreePlayerScorer, points, category);
        this.p1StagedScore = 0;
      }
    } else {
      const points = side === 1 ? this.p1StagedScore : this.p2StagedScore;
      const category = side === 1 ? this.p1Category : this.p2Category;
      const scoringPlayer = this.gameState.mode === 4
        ? (side === 1 ? this.p1ActiveScorer : this.p2ActiveScorer)
        : side;
      if (points > 0) {
        this.gameService.addPoints(scoringPlayer, points, category);
        this.clearStagedScore(side);
      }
    }
  }

  public getGameCategoryPoints(playerNum: number, category: 'Pegging' | 'Hand' | 'Crib'): number {
    if (!this.gameState || !this.gameState.scoreLogs) return 0;
    return this.gameState.scoreLogs
      .filter(log => log.player === playerNum && log.reason === category)
      .reduce((sum, log) => sum + log.delta, 0);
  }

  public addPoints(points: number) {
    this.gameService.addPoints(this.scoringPlayer, points, this.scoreReason);
    this.customScoreInput = 0;
  }

  public addCustomPoints() {
    if (this.customScoreInput > 0) {
      this.gameService.addPoints(this.scoringPlayer, this.customScoreInput, this.scoreReason);
      this.customScoreInput = 0;
    }
  }

  public undo(playerNum?: number) {
    this.gameService.undo(playerNum);
  }

  public redo(playerNum?: number) {
    this.gameService.redo(playerNum);
  }

  public canUndo(playerNum: number): boolean {
    if (!this.gameState || !this.gameState.scoreLogs) return false;
    const mode = this.gameState.mode;
    return this.gameState.scoreLogs.some(log => {
      if (mode === 4) {
        const logTeam = (log.player === 1 || log.player === 3) ? 1 : 2;
        const targetTeam = (playerNum === 1 || playerNum === 3) ? 1 : 2;
        return logTeam === targetTeam;
      }
      return log.player === playerNum;
    });
  }

  public canRedo(playerNum: number): boolean {
    if (!this.gameState || !this.gameState.playerRedoStacks) return false;
    const stack = this.gameState.playerRedoStacks[playerNum] || [];
    return stack.length > 0;
  }

  public onNewHand() {
    this.p1Category = 'Pegging';
    this.p2Category = 'Pegging';
    this.gameService.newHand();
  }

  public swapPlayers3P(idx1: number, idx2: number) {
    if (this.activeThreePlayerScorer === idx1) {
      this.activeThreePlayerScorer = idx2 as any;
    } else if (this.activeThreePlayerScorer === idx2) {
      this.activeThreePlayerScorer = idx1 as any;
    }
    this.gameService.swapPlayers3P(idx1, idx2);
  }

  public resetGame() {
    if (this.gameState && this.gameState.isActive && this.gameState.winner === null) {
      this.showResetConfirm = true;
    } else {
      this.confirmReset();
    }
  }

  public confirmReset() {
    this.gameService.resetGame();
    this.p1StagedScore = 0;
    this.p2StagedScore = 0;
    this.p1Category = 'Pegging';
    this.p2Category = 'Pegging';
    this.showResetConfirm = false;
  }

  // --- Helpers for color and player scoring ---
  public getPlayerColor(pNum: number): string {
    if (pNum === 1) return 'var(--player-one-color)';
    if (pNum === 2) return 'var(--player-two-color)';
    if (pNum === 3) return 'var(--player-three-color)';
    return 'var(--player-four-color)';
  }

  public getFirstName(fullName: string | undefined | null): string {
    if (!fullName) return '';
    return fullName.trim().split(/\s+/)[0];
  }

  public getPlayerName(pNum: number): string {
    if (!this.gameState) return '';
    let name = '';
    if (pNum === 1) name = this.gameState.player1.name;
    else if (pNum === 2) name = this.gameState.player2.name;
    else if (pNum === 3) name = this.gameState.player3?.name || '';
    else name = this.gameState.player4?.name || '';
    return this.getFirstName(name);
  }

  public getPlayerScore(pNum: number): number {
    if (!this.gameState) return 0;
    if (pNum === 1) return this.gameState.player1.score;
    if (pNum === 2) return this.gameState.player2.score;
    if (pNum === 3) return this.gameState.player3?.score || 0;
    return this.gameState.player4?.score || 0;
  }

  // --- Pegboard Drawing Logic ---
  private resizeCanvas() {
    if (!this.canvasRef) return;
    const canvas = this.canvasRef.nativeElement;
    const container = canvas.parentElement;
    if (container) {
      canvas.width = container.clientWidth || 360;
      canvas.height = 420; // Fixed visual height
      this.drawBoard();
    }
  }

  private animatePegs() {
    if (!this.canvasRef) return;
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);

    const step = () => {
      let needsRedraw = false;

      // Animate Player 1 peg
      const diff1 = this.gameState.player1.score - this.animScore1;
      if (Math.abs(diff1) > 0.05) {
        this.animScore1 += diff1 * 0.15; // smooth ease out
        needsRedraw = true;
      } else {
        this.animScore1 = this.gameState.player1.score;
      }

      // Animate Player 2 peg
      const diff2 = this.gameState.player2.score - this.animScore2;
      if (Math.abs(diff2) > 0.05) {
        this.animScore2 += diff2 * 0.15;
        needsRedraw = true;
      } else {
        this.animScore2 = this.gameState.player2.score;
      }

      // Animate Player 3 peg
      if (this.gameState.mode === 3 && this.gameState.player3) {
        const diff3 = this.gameState.player3.score - this.animScore3;
        if (Math.abs(diff3) > 0.05) {
          this.animScore3 += diff3 * 0.15;
          needsRedraw = true;
        } else {
          this.animScore3 = this.gameState.player3.score;
        }
      }

      this.drawBoard();

      if (needsRedraw) {
        this.animationFrameId = requestAnimationFrame(step);
      } else {
        this.animationFrameId = null;
      }
    };

    this.animationFrameId = requestAnimationFrame(step);
  }

  private getCoordinates(playerNum: number, score: number): { x: number; y: number } {
    const canvas = this.canvasRef.nativeElement;
    const mode = this.gameState ? this.gameState.mode : 2;
    
    // Scale layout to canvas size
    const centerX = canvas.width / 2;
    const startY = canvas.height - 50;
    const endY = 60;
    const trackHeight = startY - endY;
    
    const r1 = Math.min(canvas.width * 0.16, 50); // Inner radius
    const laneSpacing = mode === 3 ? 15 : 18;
    
    let r = r1;
    if (playerNum === 2) {
      r = r1 + laneSpacing;
    } else if (playerNum === 3) {
      r = r1 + laneSpacing * 2;
    }

    if (score <= 0) {
      // Start area at the bottom-left
      let xOffset = -12;
      if (playerNum === 2) xOffset = -26;
      if (playerNum === 3) xOffset = -40;
      return { 
        x: centerX - r1 + xOffset, 
        y: startY + 15 
      };
    }
    
    if (score >= 121) {
      // Finish area at the bottom center
      let xOffset = 0;
      if (playerNum === 1) xOffset = -8;
      if (playerNum === 2) xOffset = 0;
      if (playerNum === 3) xOffset = 8;
      return { 
        x: centerX + xOffset, 
        y: startY + 18 
      };
    }

    // Hairpin Track Mapping:
    // Holes 1 - 45: Left straight path (going UP)
    // Holes 46 - 75: Semicircular loop (going CLOCKWISE)
    // Holes 76 - 120: Right straight path (going DOWN)
    
    if (score <= 45) {
      const ratio = (score - 1) / 44;
      const y = startY - ratio * trackHeight;
      const x = centerX - r;
      return { x, y };
    } else if (score <= 75) {
      const ratio = (score - 46) / 29;
      const angle = Math.PI - ratio * Math.PI; // Sweep from PI (left) to 0 (right)
      const x = centerX + r * Math.cos(angle);
      const y = endY + r * Math.sin(angle) * 0.8; // Squish slightly for perspective
      return { x, y };
    } else {
      const ratio = (score - 76) / 44;
      const y = endY + ratio * trackHeight;
      const x = centerX + r;
      return { x, y };
    }
  }

  private drawBoard() {
    if (!this.canvasRef) return;
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mode = this.gameState ? this.gameState.mode : 2;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw track backdrop (Glassmorphic dark pill board background)
    ctx.save();
    ctx.fillStyle = 'rgba(25, 27, 38, 0.4)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2;
    
    const r1 = Math.min(canvas.width * 0.16, 50);
    const laneSpacing = mode === 3 ? 15 : 18;
    const numLanes = mode === 3 ? 3 : 2;
    const rOuter = r1 + laneSpacing * (numLanes - 1) + 16;
    const startY = canvas.height - 50;
    const endY = 60;
    
    // Draw outer racetrack shape
    ctx.beginPath();
    ctx.arc(canvas.width / 2, endY, rOuter, Math.PI, 0, false);
    ctx.lineTo(canvas.width / 2 + rOuter, startY + 35);
    ctx.arc(canvas.width / 2, startY + 20, rOuter, 0, Math.PI, false);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 2. Draw all holes
    ctx.save();
    for (let s = 1; s <= 120; s++) {
      const isFifth = s % 5 === 0;

      for (let l = 1; l <= numLanes; l++) {
        const coords = this.getCoordinates(l, s);
        ctx.beginPath();
        ctx.arc(coords.x, coords.y, isFifth ? 2.5 : 1.5, 0, Math.PI * 2);
        
        let color = 'rgba(255, 255, 255, 0.2)';
        if (isFifth) {
          if (l === 1) color = 'rgba(6, 182, 212, 0.5)';
          else if (l === 2) color = 'rgba(217, 70, 239, 0.5)';
          else color = 'rgba(16, 185, 129, 0.5)';
        }
        ctx.fillStyle = color;
        ctx.fill();
      }

      // Every 5th hole, draw a tiny score indicator label on the left/right straightaways
      if (isFifth && s % 10 === 0 && (s <= 40 || s >= 80)) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.font = '8px var(--ion-font-family)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const outerCoords = this.getCoordinates(numLanes, s);
        if (s <= 40) {
          // Left track, draw index numbers to the left of the outer track
          ctx.fillText(s.toString(), outerCoords.x - 14, outerCoords.y);
        } else {
          // Right track, draw index numbers to the right of the outer track
          ctx.fillText(s.toString(), outerCoords.x + 14, outerCoords.y);
        }
      }
    }

    // Draw Start Holes
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.font = '7px var(--ion-font-family)';
    for (let l = 1; l <= numLanes; l++) {
      const startCoords = this.getCoordinates(l, 0);
      ctx.fillText('S', startCoords.x, startCoords.y - 8);
      ctx.beginPath();
      ctx.arc(startCoords.x, startCoords.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Finish Holes
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    for (let l = 1; l <= numLanes; l++) {
      const finishCoords = this.getCoordinates(l, 121);
      ctx.fillText('F', finishCoords.x + (l === 1 ? -10 : (l === 2 ? 0 : 10)), finishCoords.y);
      ctx.beginPath();
      ctx.arc(finishCoords.x, finishCoords.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 3. Draw Active and Trailing pegs
    this.drawPlayerPegs(ctx, 1, this.animScore1, this.gameState.player1.prevScore, '#06b6d4', 'rgba(6, 182, 212, 0.6)');
    this.drawPlayerPegs(ctx, 2, this.animScore2, this.gameState.player2.prevScore, '#d946ef', 'rgba(217, 70, 239, 0.6)');
    if (mode === 3 && this.gameState.player3) {
      this.drawPlayerPegs(ctx, 3, this.animScore3, this.gameState.player3.prevScore, '#10b981', 'rgba(16, 185, 129, 0.6)');
    }
  }

  private drawPlayerPegs(
    ctx: CanvasRenderingContext2D,
    playerNum: number,
    animScore: number,
    prevScore: number,
    colorHex: string,
    glowColor: string
  ) {
    ctx.save();

    // Get exact visual coords for animated position and trailing position
    const activeCoords = this.getCoordinates(playerNum, animScore);
    const trailCoords = this.getCoordinates(playerNum, prevScore);

    // Draw trailing peg (if it's not at the same place as active peg)
    const distance = Math.hypot(activeCoords.x - trailCoords.x, activeCoords.y - trailCoords.y);
    if (distance > 1 && prevScore > 0) {
      ctx.shadowBlur = 6;
      ctx.shadowColor = glowColor;
      ctx.fillStyle = colorHex;
      ctx.globalAlpha = 0.5; // Faded trailing peg
      ctx.beginPath();
      ctx.arc(trailCoords.x, trailCoords.y, 4, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw subtle dashed path line connecting the pegs
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.2;
      ctx.strokeStyle = colorHex;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(trailCoords.x, trailCoords.y);
      ctx.lineTo(activeCoords.x, activeCoords.y);
      ctx.stroke();
    }

    // Draw active peg
    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = glowColor;
    ctx.fillStyle = '#ffffff'; // white core
    ctx.strokeStyle = colorHex; // neon wrapper border
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 1.0;

    ctx.beginPath();
    ctx.arc(activeCoords.x, activeCoords.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }
}
