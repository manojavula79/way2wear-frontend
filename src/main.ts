import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { addIcons } from 'ionicons';
import {
  chevronBackOutline,
  downloadOutline,
  shareSocialOutline,
  colorWandOutline,
  send,
  alertCircleOutline,
} from 'ionicons/icons';

addIcons({
  'chevron-back-outline': chevronBackOutline,
  'download-outline': downloadOutline,
  'share-social-outline': shareSocialOutline,
  'color-wand-outline': colorWandOutline,
  send,
  'alert-circle-outline': alertCircleOutline,
});

bootstrapApplication(AppComponent, appConfig).catch((err) =>
  console.error('Way2Wear bootstrap error:', err)
);
