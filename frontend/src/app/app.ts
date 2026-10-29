import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthSessionService } from './core/auth/auth-session.service';
import { ROLE_LABELS } from './core/auth/role-home';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly session = inject(AuthSessionService);
  private readonly router = inject(Router);
  protected readonly roleLabels = ROLE_LABELS;

  protected logout(): void {
    this.session.logout();
    void this.router.navigateByUrl('/login');
  }
}
