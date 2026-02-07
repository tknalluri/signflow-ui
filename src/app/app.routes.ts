import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'auth/login',
    loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'auth/signup',
    loadComponent: () => import('./auth/signup/signup.component').then(m => m.SignupComponent)
  },
  {
    path: 'auth/forgot-password',
    loadComponent: () => import('./auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/home/home.component').then(m => m.HomeComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'profile',
    loadComponent: () => import('./profile/profile.component').then(m => m.ProfileComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'settings',
    loadComponent: () => import('./settings/settings.component').then(m => m.SettingsComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'help',
    loadComponent: () => import('./help/help.component').then(m => m.HelpComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'documents/viewer/:id',
    loadComponent: () => import('./documents/viewer/viewer.component').then(m => m.ViewerComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'documents/list',
    loadComponent: () => import('./documents/list/documents-list.component').then(m => m.DocumentsListComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'documents/editor/:id',
    loadComponent: () => import('./documents/editor/editor.component').then(m => m.EditorComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'documents/signature/:id',
    loadComponent: () => import('./documents/signature/signature.component').then(m => m.SignatureComponent),
    canActivate: [AuthGuard]
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
