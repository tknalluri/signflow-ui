import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { User } from '../core/models/user.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent {
  user: User | null;

  constructor(private authService: AuthService, private router: Router) {
    this.user = this.authService.currentUserValue;
  }

  logout() {
    this.authService.logout();
  }

  backToDashboard() {
    this.router.navigate(['/dashboard']);
  }
}
