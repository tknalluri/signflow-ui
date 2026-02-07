import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent implements OnInit {
  private readonly settingsKey = 'signflow.settings';
  signaturePlacement = {
    page: 1,
    x: 50,
    y: 50,
    size: 120
  };

  autoSaveEnabled = true;
  autoDownloadEnabled = false;
  timezone = 'America/New_York';
  locale = 'en-US';
  dateFormat = 'short';

  password = {
    current: '',
    next: '',
    confirm: ''
  };

  constructor(private authService: AuthService, private router: Router) {}

  backToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  signOut() {
    this.authService.logout();
  }

  savePreferences() {
    const payload = {
      signaturePlacement: this.signaturePlacement,
      autoSaveEnabled: this.autoSaveEnabled,
      autoDownloadEnabled: this.autoDownloadEnabled,
      timezone: this.timezone,
      locale: this.locale,
      dateFormat: this.dateFormat
    };
    localStorage.setItem(this.settingsKey, JSON.stringify(payload));
    alert('Preferences saved.');
  }

  updatePassword() {
    if (!this.password.current || !this.password.next || !this.password.confirm) {
      alert('Please fill in all password fields.');
      return;
    }
    if (this.password.next !== this.password.confirm) {
      alert('New password and confirmation do not match.');
      return;
    }
    this.authService.changePassword(this.password.current, this.password.next).subscribe({
      next: () => {
        alert('Password updated successfully.');
        this.password = { current: '', next: '', confirm: '' };
      },
      error: (error) => {
        console.error('Password update error:', error);
        alert('Failed to update password.');
      }
    });
  }

  ngOnInit() {
    const saved = localStorage.getItem(this.settingsKey);
    if (!saved) return;
    try {
      const data = JSON.parse(saved);
      if (data.signaturePlacement) {
        this.signaturePlacement = { ...this.signaturePlacement, ...data.signaturePlacement };
      }
      if (typeof data.autoSaveEnabled === 'boolean') this.autoSaveEnabled = data.autoSaveEnabled;
      if (typeof data.autoDownloadEnabled === 'boolean') this.autoDownloadEnabled = data.autoDownloadEnabled;
      if (data.timezone) this.timezone = data.timezone;
      if (data.locale) this.locale = data.locale;
      if (data.dateFormat) this.dateFormat = data.dateFormat;
    } catch {
      // Ignore corrupted settings
    }
  }
}
