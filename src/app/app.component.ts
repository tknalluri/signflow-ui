import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, NgIf, FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatCheckboxModule, MatIconModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  constructor() {}

  formData = {
    fullName: '',
    email: '',
    password: '',
    agreeToTerms: false
  };

  submitted = false;

  onSignUp() {
    this.submitted = true;
    if (this.formData.fullName && this.formData.email && this.formData.password && this.formData.agreeToTerms) {
      console.log('Form submitted:', this.formData);
      alert(`Welcome ${this.formData.fullName}! Account created successfully.`);
      this.formData = { fullName: '', email: '', password: '', agreeToTerms: false };
      this.submitted = false;
    }
  }
}
