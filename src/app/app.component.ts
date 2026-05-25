import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { IonApp } from '@ionic/angular/standalone';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [IonApp, RouterOutlet],
})
export class AppComponent implements OnInit {
  title = 'Way2Wear';

  ngOnInit() {
    this.initCapacitorPlugins();
  }

  private async initCapacitorPlugins() {
    if (Capacitor.isNativePlatform()) {
      try {
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: '#FFFFFF' });
      } catch (e) {
        console.warn('StatusBar not available:', e);
      }
    }
  }
}
