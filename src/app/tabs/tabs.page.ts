import { Component, EnvironmentInjector, inject } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { gameControllerOutline, calculatorOutline, analyticsOutline, chevronUpOutline, chevronDownOutline } from 'ionicons/icons';

@Component({
    selector: 'app-tabs',
    templateUrl: 'tabs.page.html',
    styleUrls: ['tabs.page.scss'],
    imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel]
})
export class TabsPage {
  public environmentInjector = inject(EnvironmentInjector);
  public menuOpen = true; // Open by default for discoverability

  constructor() {
    addIcons({ gameControllerOutline, calculatorOutline, analyticsOutline, chevronUpOutline, chevronDownOutline });
  }

  public toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }
}
