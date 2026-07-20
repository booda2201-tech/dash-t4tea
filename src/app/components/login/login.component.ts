import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { gsap } from 'gsap';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginData = { phone: '', password: '' };
  errorMessage = '';
  isLoading = false;

  constructor(
    private router: Router,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/choose-section']);
      return;
    }

    gsap.from('.login-card', {
      duration: 1,
      y: 30,
      opacity: 0,
      ease: 'power3.out'
    });
  }

  onLogin(): void {
    if (!this.loginData.phone.trim() || !this.loginData.password) {
      this.errorMessage = 'ادخل رقم الهاتف وكلمة المرور.';
      this.shakeCard();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.auth.login({
      phone: this.loginData.phone.trim(),
      password: this.loginData.password
    }).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (!this.auth.isLoggedIn()) {
          this.errorMessage = 'تم تسجيل الدخول لكن لم يتم استلام التوكن من السيرفر.';
          this.shakeCard();
          return;
        }
        this.router.navigate(['/choose-section']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage =
          err?.error?.message ||
          (err?.status === 404
            ? 'تعذر الوصول للـ API. أعد تشغيل السيرفر بـ npm start'
            : 'بيانات الدخول غير صحيحة، حاول مرة أخرى.');
        this.shakeCard();
      }
    });
  }

  private shakeCard(): void {
    gsap.to('.login-card', {
      duration: 0.1,
      y: 10,
      x: 10,
      repeat: 5,
      yoyo: true,
      ease: 'power1.inOut',
      onComplete: () => {
        gsap.set('.login-card', { x: 0, y: 0 });
      }
    });
  }
}
