import { Component, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-profile-panel',
  templateUrl: './profile-panel.component.html',
  styleUrls: ['./profile-panel.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class ProfilePanelComponent {
  @Output() closed = new EventEmitter<void>();

  private userService = inject(UserService);
  private authService = inject(AuthService);
  profile = this.userService.profile;

  close() { this.closed.emit(); }

  logout() {
    this.closed.emit();
    this.authService.logout();   // clears tokens + navigates to /login
  }
}
