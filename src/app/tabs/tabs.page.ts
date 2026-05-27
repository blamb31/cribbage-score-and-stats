import { Component, EnvironmentInjector, inject } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { gameControllerOutline, calculatorOutline, analyticsOutline, closeOutline } from 'ionicons/icons';
import { GameService } from '../services/game.service';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-tabs',
    templateUrl: 'tabs.page.html',
    styleUrls: ['tabs.page.scss'],
    imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, CommonModule]
})
export class TabsPage {
  public environmentInjector = inject(EnvironmentInjector);
  private router = inject(Router);
  public currentTab = 'tab1';

  constructor(public gameService: GameService) {
    addIcons({ gameControllerOutline, calculatorOutline, analyticsOutline, closeOutline });
    this.updateCurrentTab(this.router.url);

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.updateCurrentTab(event.urlAfterRedirects || event.url || '');
    });
  }

  private updateCurrentTab(url: string) {
    if (url.includes('/tab2')) {
      this.currentTab = 'tab2';
    } else if (url.includes('/tab3')) {
      this.currentTab = 'tab3';
    } else {
      this.currentTab = 'tab1';
      // Default navbar to closed when navigating back to scoring page if a game is active
      if (this.gameService.currentGameState.isActive) {
        this.gameService.showTabBar = false;
      }
    }
  }
}
