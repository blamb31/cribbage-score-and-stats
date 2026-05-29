import { Injectable } from '@angular/core';
import { GameService } from './game.service';

export interface WalkthroughStep {
  targetId: string;
  title: string;
  description: string;
}

export interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

@Injectable({
  providedIn: 'root'
})
export class OnboardingService {
  private activeKey: string | null = null;
  private steps: WalkthroughStep[] = [];
  
  public isActive = false;
  public currentStepIndex = 0;
  
  // Highlight layout box
  public highlightRect: HighlightRect = { top: 0, left: 0, width: 0, height: 0 };
  
  // Tooltip coordinates
  public tooltipTop = 0;
  public tooltipLeft = 0;

  // Track scrollable elements to clean up listeners
  private scrollElements: HTMLElement[] = [];
  private boundScrollHandler = () => this.updateStepPosition();

  constructor(private gameService: GameService) {
    // Listen to window resizing to update positions dynamically
    window.addEventListener('resize', () => {
      if (this.isActive) {
        this.updateStepPosition();
      }
    });

    // Listen to scroll events on any container (using capturing phase since scroll doesn't bubble)
    window.addEventListener('scroll', () => {
      if (this.isActive) {
        this.updateStepPosition();
      }
    }, { capture: true, passive: true });

    // Intercept clicks on the page when walkthrough is active, allowing them only if they are inside the tooltip
    window.addEventListener('click', (event) => {
      if (this.isActive) {
        const tooltip = document.querySelector('.walkthrough-tooltip');
        if (tooltip && !tooltip.contains(event.target as Node)) {
          event.preventDefault();
          event.stopPropagation();
        }
      }
    }, { capture: true });
  }

  /**
   * Starts a walkthrough session if not already completed in localStorage.
   */
  public start(key: string, steps: WalkthroughStep[], force = false) {
    if (!force && localStorage.getItem(key) === 'true') {
      return;
    }

    this.activeKey = key;
    this.steps = steps;
    this.currentStepIndex = 0;
    this.isActive = true;
    
    // Allow the DOM to render the target elements if switching view before updating positions
    setTimeout(() => {
      this.scrollToTarget();
      this.setupScrollListeners();
      this.updateStepPosition();

      // Safeguard updates as smooth scrolling completes
      for (const delay of [50, 100, 200, 300, 400, 500, 600]) {
        setTimeout(() => this.updateStepPosition(), delay);
      }
    }, 150);
  }

  /**
   * Moves to the next step or finishes the walkthrough.
   */
  public next() {
    if (!this.isActive) return;

    if (this.currentStepIndex < this.steps.length - 1) {
      this.currentStepIndex++;
      this.scrollToTarget();
      this.setupScrollListeners();
      this.updateStepPosition();

      // Safeguard updates as smooth scrolling completes
      for (const delay of [50, 100, 200, 300, 400, 500, 600]) {
        setTimeout(() => this.updateStepPosition(), delay);
      }
    } else {
      this.complete();
    }
  }

  /**
   * Moves to the previous step.
   */
  public prev() {
    if (!this.isActive || this.currentStepIndex === 0) return;
    this.currentStepIndex--;
    this.scrollToTarget();
    this.setupScrollListeners();
    this.updateStepPosition();

    // Safeguard updates as smooth scrolling completes
    for (const delay of [50, 100, 200, 300, 400, 500, 600]) {
      setTimeout(() => this.updateStepPosition(), delay);
    }
  }

  /**
   * Scrolls the target element of the current step into view.
   */
  private scrollToTarget() {
    const step = this.currentStep;
    if (!step) return;

    const element = document.getElementById(step.targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  /**
   * Set up scroll event listeners for all active ion-content elements' scroll containers.
   * This ensures the highlight updates smoothly during transitions and manual scrolling.
   */
  private setupScrollListeners() {
    this.cleanupScrollListeners();

    if (!this.isActive) return;

    const contents = Array.from(document.querySelectorAll('ion-content'));
    contents.forEach(content => {
      if (typeof (content as any).getScrollElement === 'function') {
        (content as any).getScrollElement().then((scrollEl: HTMLElement) => {
          if (scrollEl && this.isActive) {
            // Avoid duplicate listeners
            if (!this.scrollElements.includes(scrollEl)) {
              scrollEl.addEventListener('scroll', this.boundScrollHandler, { passive: true });
              this.scrollElements.push(scrollEl);
            }
          }
        });
      }
    });
  }

  /**
   * Remove scroll event listeners from all tracked scroll containers.
   */
  private cleanupScrollListeners() {
    this.scrollElements.forEach(el => {
      el.removeEventListener('scroll', this.boundScrollHandler);
    });
    this.scrollElements = [];
  }

  /**
   * Skips/cancels the current walkthrough.
   */
  public skip() {
    this.complete();
  }

  /**
   * Resets onboarding completion flag for a key (helpful for debugging or user-triggered resets).
   */
  public resetCompletion(key: string) {
    localStorage.removeItem(key);
  }

  /**
   * Returns the current active step configuration.
   */
  public get currentStep(): WalkthroughStep | null {
    if (!this.isActive || this.steps.length === 0) return null;
    return this.steps[this.currentStepIndex];
  }

  /**
   * Returns total step count.
   */
  public get totalSteps(): number {
    return this.steps.length;
  }

  /**
   * Finalizes walkthrough state and persists completion flag.
   */
  private complete() {
    this.isActive = false;
    this.cleanupScrollListeners();
    if (this.activeKey) {
      localStorage.setItem(this.activeKey, 'true');
      if (this.activeKey === 'onboarded_play') {
        localStorage.setItem('onboarded_play_layout_toggle', 'true');
      }
      // Auto-hide tab bar after walkthrough completes
      if (this.activeKey === 'onboarded_play' || this.activeKey === 'onboarded_play_layout_toggle') {
        this.gameService.showTabBar = false;
      }
    }
    this.activeKey = null;
    this.steps = [];
    this.currentStepIndex = 0;
  }

  /**
   * Queries DOM and calculates position for highlight overlay and tooltip.
   */
  public updateStepPosition() {
    const step = this.currentStep;
    if (!step) return;

    // Auto-reveal tab bar (navbar) when targeting the layout toggle button
    if (step.targetId === 'game-layout-toggle' && !this.gameService.showTabBar) {
      this.gameService.showTabBar = true;
    }

    const appElement = document.querySelector('ion-app');
    const appRect = appElement?.getBoundingClientRect() || { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
    const containerWidth = appRect.width;
    const containerHeight = appRect.height;

    const element = document.getElementById(step.targetId);
    if (!element) {
      // If target element is not found on screen yet (hidden or offscreen), default to a centered highlight box inside container
      this.highlightRect = {
        top: containerHeight / 2 - 10,
        left: containerWidth / 2 - 10,
        width: 20,
        height: 20
      };
      this.tooltipTop = containerHeight / 2 - 80;
      this.tooltipLeft = containerWidth / 2 - 130;
      return;
    }

    const rect = element.getBoundingClientRect();
    
    // Add small padding around the highlighted cutout, relative to ion-app
    const pad = 6;
    this.highlightRect = {
      top: Math.max(0, rect.top - appRect.top - pad),
      left: Math.max(0, rect.left - appRect.left - pad),
      width: rect.width + (pad * 2),
      height: rect.height + (pad * 2)
    };

    // Calculate vertical alignment for tooltip relative to container boundaries
    const spaceBelow = containerHeight - (this.highlightRect.top + this.highlightRect.height);
    const spaceAbove = this.highlightRect.top;

    if (spaceBelow > 190) {
      // Place below
      this.tooltipTop = this.highlightRect.top + this.highlightRect.height + 12;
    } else if (spaceAbove > 190) {
      // Place above
      this.tooltipTop = this.highlightRect.top - 180;
    } else {
      // Fallback: place centered overlay (overlapping target)
      this.tooltipTop = Math.max(20, this.highlightRect.top + (this.highlightRect.height / 2) - 80);
    }

    // Keep tooltip horizontally safe-bounded within container
    const tooltipWidth = 260;
    const centerOfTarget = this.highlightRect.left + (this.highlightRect.width / 2);
    let leftPos = centerOfTarget - (tooltipWidth / 2);
    
    // Ensure padding from container edges
    leftPos = Math.max(12, Math.min(containerWidth - tooltipWidth - 12, leftPos));
    this.tooltipLeft = leftPos;
  }
}
