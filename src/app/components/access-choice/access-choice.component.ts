import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-access-choice',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './access-choice.component.html',
  styleUrls: ['./access-choice.component.scss']
})
export class AccessChoiceComponent {
  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  logout(): void {
    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login'])
    });
  }
}
