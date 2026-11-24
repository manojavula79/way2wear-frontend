import { APP_INITIALIZER, ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { IonicModule } from '@ionic/angular';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { AuthService } from './core/services/auth.service';
import { UserService } from './core/services/user.service';

/** Restore the persistent session before the router evaluates any guard. */
export function restoreSessionFactory(auth: AuthService, users: UserService) {
  return async (): Promise<void> => {
    await auth.restoreSession();
    if (auth.isAuthenticated()) users.loadFromServer();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: restoreSessionFactory,
      deps: [AuthService, UserService],
    },
    importProvidersFrom(
      IonicModule.forRoot({
        mode: 'ios',
        animated: true,
        rippleEffect: false,
        swipeBackEnabled: false,
      })
    ),
  ],
};
