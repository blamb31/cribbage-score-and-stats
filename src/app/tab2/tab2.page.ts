import { Component, OnInit, OnDestroy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { GameService, GameState } from '../services/game.service';
import { Subscription } from 'rxjs';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonGrid, IonRow, IonCol, 
  IonButton, IonIcon, IonCard, IonCardContent, IonCardHeader, IonCardTitle,
  IonItem, IonLabel, IonSegment, IonSegmentButton, IonList, IonNote, IonButtons,
  IonModal
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  calculatorOutline, trashOutline, checkmarkCircleOutline, addOutline, 
  helpCircleOutline, sparklesOutline, informationCircleOutline
} from 'ionicons/icons';

export interface Card {
  rank: number; // 1 = Ace, 11 = Jack, 12 = Queen, 13 = King
  suit: 'S' | 'H' | 'D' | 'C'; // Spades, Hearts, Diamonds, Clubs
}

export interface ScoreBreakdown {
  type: string;
  points: number;
  description: string;
}

@Component({
    selector: 'app-tab2',
    templateUrl: 'tab2.page.html',
    styleUrls: ['tab2.page.scss'],
    imports: [
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
    IonSegment,
    IonSegmentButton,
    IonList,
    IonNote,
    IonButtons,
    IonModal
]
})
export class Tab2Page implements OnInit, OnDestroy {
  public gameState!: GameState;
  private gameSub!: Subscription;

  // Selected cards state
  public handCards: Card[] = [];
  public cutCard: Card | null = null;

  get hasHandCards(): boolean {
    return this.handCards && this.handCards.some(card => !!card);
  }

  // Active slot selection
  // 0, 1, 2, 3 for hand cards, 4 for cut card
  public activeSlot: number = 0;

  // Picker choices
  public suits: { symbol: string; value: 'S' | 'H' | 'D' | 'C'; name: string }[] = [
    { symbol: '♠', value: 'S', name: 'Spades' },
    { symbol: '♥', value: 'H', name: 'Hearts' },
    { symbol: '♦', value: 'D', name: 'Diamonds' },
    { symbol: '♣', value: 'C', name: 'Clubs' }
  ];

  public ranks: { label: string; value: number }[] = [
    { label: 'A', value: 1 },
    { label: '2', value: 2 },
    { label: '3', value: 3 },
    { label: '4', value: 4 },
    { label: '5', value: 5 },
    { label: '6', value: 6 },
    { label: '7', value: 7 },
    { label: '8', value: 8 },
    { label: '9', value: 9 },
    { label: '10', value: 10 },
    { label: 'J', value: 11 },
    { label: 'Q', value: 12 },
    { label: 'K', value: 13 }
  ];

  // Score outputs
  public totalScore = 0;
  public breakdown: ScoreBreakdown[] = [];

  // Whether the calculated points are for a Crib hand or normal hand
  public isCribMode = false;
  
  // Who to apply points to (defaults to current scoring player)
  public applyToPlayer: number = 1;

  // Rules modal state
  public isRulesModalOpen = false;
  public activeRulesTab = 'general';

  constructor(public gameService: GameService) {
    addIcons({
      calculatorOutline, trashOutline, checkmarkCircleOutline, addOutline, 
      helpCircleOutline, sparklesOutline, informationCircleOutline
    });
  }

  ngOnInit() {
    this.gameSub = this.gameService.gameState$.subscribe(state => {
      this.gameState = state;
    });
  }

  public getFirstName(name: string | undefined | null): string {
    if (!name) return '';
    return name.trim().split(/\s+/)[0];
  }

  ngOnDestroy() {
    if (this.gameSub) this.gameSub.unsubscribe();
  }

  public getRankLabel(rank: number): string {
    if (rank === 1) return 'A';
    if (rank === 11) return 'J';
    if (rank === 12) return 'Q';
    if (rank === 13) return 'K';
    return rank.toString();
  }

  public getSuitSymbol(suit: 'S' | 'H' | 'D' | 'C'): string {
    if (suit === 'S') return '♠';
    if (suit === 'H') return '♥';
    if (suit === 'D') return '♦';
    return '♣';
  }

  public isCardSelected(rank: number, suit: 'S' | 'H' | 'D' | 'C'): boolean {
    const inHand = this.handCards.some(c => c.rank === rank && c.suit === suit);
    const inCut = this.cutCard?.rank === rank && this.cutCard?.suit === suit;
    return inHand || inCut;
  }

  public selectCard(rank: number, suit: 'S' | 'H' | 'D' | 'C') {
    // If card is already selected elsewhere, do nothing (single deck only)
    if (this.isCardSelected(rank, suit)) return;

    const newCard: Card = { rank, suit };

    if (this.activeSlot === 4) {
      // Set Cut Card
      this.cutCard = newCard;
    } else {
      // Set Hand Card
      this.handCards[this.activeSlot] = newCard;
    }

    // Move selection to next slot
    this.advanceActiveSlot();
    this.calculateScore();
  }

  private advanceActiveSlot() {
    // Look for the next empty slot, or wrap around
    for (let i = 0; i < 4; i++) {
      if (!this.handCards[i]) {
        this.activeSlot = i;
        return;
      }
    }
    if (!this.cutCard) {
      this.activeSlot = 4;
      return;
    }
    // If all slots are full, keep it on cut card or hand card
    this.activeSlot = (this.activeSlot + 1) % 5;
  }

  public removeCard(slotIndex: number) {
    if (slotIndex === 4) {
      this.cutCard = null;
      this.activeSlot = 4;
    } else {
      this.handCards.splice(slotIndex, 1);
      this.activeSlot = this.handCards.length;
    }
    this.calculateScore();
  }

  public clearAll() {
    this.handCards = [];
    this.cutCard = null;
    this.activeSlot = 0;
    this.calculateScore();
  }

  public applyPointsToGame() {
    if (this.totalScore > 0 && this.gameState.isActive) {
      const label = this.isCribMode ? 'Crib' : 'Hand';
      this.gameService.addPoints(this.applyToPlayer, this.totalScore, `${label} Calculator`);
      this.clearAll();
    }
  }

  // --- Cribbage Score Calculation Algorithm ---
  public calculateScore() {
    this.totalScore = 0;
    this.breakdown = [];

    // We can only calculate if we have at least some cards
    const cards = [...this.handCards.filter(Boolean)];
    if (cards.length === 0) return;

    const allCards = [...cards];
    if (this.cutCard) {
      allCards.push(this.cutCard);
    }

    // 1. Calculate Fifteens (15s)
    this.calculateFifteens(allCards);

    // 2. Calculate Pairs
    this.calculatePairs(allCards);

    // 3. Calculate Runs
    this.calculateRuns(allCards);

    // 4. Calculate Flush (requires 4 hand cards minimum)
    this.calculateFlush(cards, this.cutCard);

    // 5. Calculate His Nobs (Jack in hand matching cut card suit)
    this.calculateHisNobs(cards, this.cutCard);

    // Sum total
    this.totalScore = this.breakdown.reduce((sum, item) => sum + item.points, 0);
  }

  private calculateFifteens(cards: Card[]) {
    const getValue = (c: Card) => c.rank >= 10 ? 10 : c.rank;
    
    // Find combinations of size 2, 3, 4, 5
    for (let size = 2; size <= cards.length; size++) {
      const combos = this.getCombinations(cards, size);
      for (const combo of combos) {
        const sum = combo.reduce((s, c) => s + getValue(c), 0);
        if (sum === 15) {
          const names = combo.map(c => this.getRankLabel(c.rank)).join(' + ');
          this.breakdown.push({
            type: 'Fifteen',
            points: 2,
            description: `15 for 2 (${names})`
          });
        }
      }
    }
  }

  private calculatePairs(cards: Card[]) {
    // Group cards by rank
    const groups: { [key: number]: Card[] } = {};
    for (const card of cards) {
      groups[card.rank] = groups[card.rank] || [];
      groups[card.rank].push(card);
    }

    for (const rank in groups) {
      const count = groups[rank].length;
      if (count === 2) {
        this.breakdown.push({
          type: 'Pair',
          points: 2,
          description: `Pair of ${this.getRankLabel(Number(rank))}s for 2`
        });
      } else if (count === 3) {
        this.breakdown.push({
          type: 'Pair',
          points: 6,
          description: `Pair Royal of ${this.getRankLabel(Number(rank))}s for 6`
        });
      } else if (count === 4) {
        this.breakdown.push({
          type: 'Pair',
          points: 12,
          description: `Double Pair Royal of ${this.getRankLabel(Number(rank))}s for 12`
        });
      }
    }
  }

  private calculateRuns(cards: Card[]) {
    if (cards.length < 3) return;

    // Get frequencies of each rank
    const freqs: { [key: number]: number } = {};
    for (const card of cards) {
      freqs[card.rank] = (freqs[card.rank] || 0) + 1;
    }

    // Sort unique ranks
    const uniqueRanks = Object.keys(freqs).map(Number).sort((a, b) => a - b);

    // Find runs of unique ranks
    let currentRun: number[] = [];
    let longestRuns: number[][] = [];

    for (let i = 0; i < uniqueRanks.length; i++) {
      const rank = uniqueRanks[i];
      if (currentRun.length === 0 || rank === currentRun[currentRun.length - 1] + 1) {
        currentRun.push(rank);
      } else {
        if (currentRun.length >= 3) {
          longestRuns.push([...currentRun]);
        }
        currentRun = [rank];
      }
    }
    if (currentRun.length >= 3) {
      longestRuns.push(currentRun);
    }

    // In a 5 card hand, you can only have at most one run of length >= 3
    if (longestRuns.length > 0) {
      // Sort to get the longest run
      longestRuns.sort((a, b) => b.length - a.length);
      const run = longestRuns[0]; // The longest run
      const length = run.length;

      // The points earned are length * product of frequencies of each rank in the run
      let multiplier = 1;
      for (const rank of run) {
        multiplier *= freqs[rank];
      }

      const totalPoints = length * multiplier;
      const cardsInRunStr = run.map(r => this.getRankLabel(r)).join('-');

      let desc = '';
      if (multiplier === 1) {
        desc = `Run of ${length} (${cardsInRunStr}) for ${length}`;
      } else if (multiplier === 2) {
        desc = `Double Run of ${length} (${cardsInRunStr}) for ${totalPoints}`;
      } else if (multiplier === 3) {
        desc = `Triple Run of ${length} (${cardsInRunStr}) for ${totalPoints}`;
      } else if (multiplier === 4) {
        desc = `Double-Double Run of ${length} (${cardsInRunStr}) for ${totalPoints}`;
      } else {
        desc = `Multiple Runs of ${length} for ${totalPoints}`;
      }

      this.breakdown.push({
        type: 'Run',
        points: totalPoints,
        description: desc
      });
    }
  }

  private calculateFlush(handCards: Card[], cutCard: Card | null) {
    // Only hand cards can score a flush (min 4 cards)
    if (handCards.length < 4) return;

    const firstSuit = handCards[0].suit;
    const handFlush = handCards.every(c => c.suit === firstSuit);

    if (handFlush) {
      if (this.isCribMode) {
        // In the Crib, a flush is ONLY scored if the cut card ALSO matches
        if (cutCard && cutCard.suit === firstSuit) {
          this.breakdown.push({
            type: 'Flush',
            points: 5,
            description: `5-Card Crib Flush for 5 (${firstSuit}s)`
          });
        }
      } else {
        // Normal hand flush
        if (cutCard && cutCard.suit === firstSuit) {
          this.breakdown.push({
            type: 'Flush',
            points: 5,
            description: `5-Card Hand Flush for 5 (${firstSuit}s)`
          });
        } else {
          this.breakdown.push({
            type: 'Flush',
            points: 4,
            description: `4-Card Hand Flush for 4 (${firstSuit}s)`
          });
        }
      }
    }
  }

  private calculateHisNobs(handCards: Card[], cutCard: Card | null) {
    if (!cutCard) return;

    // Jack in hand matching the suit of the cut card
    const hasNobs = handCards.some(c => c.rank === 11 && c.suit === cutCard.suit);
    if (hasNobs) {
      this.breakdown.push({
        type: 'His Nobs',
        points: 1,
        description: `His Nobs for 1 (Jack of ${cutCard.suit})`
      });
    }
  }

  // --- Combinations Generator ---
  private getCombinations<T>(array: T[], size: number): T[][] {
    const result: T[][] = [];
    const helper = (start: number, combo: T[]) => {
      if (combo.length === size) {
        result.push([...combo]);
        return;
      }
      for (let i = start; i < array.length; i++) {
        combo.push(array[i]);
        helper(i + 1, combo);
        combo.pop();
      }
    };
    helper(0, []);
    return result;
  }
}
