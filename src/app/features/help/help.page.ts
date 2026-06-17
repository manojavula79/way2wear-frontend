import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface HelpSlide {
  title: string;
  body: string;
  /** Drop your screenshot path here, e.g. 'assets/help/step1.png'. Leave '' for placeholder. */
  image: string;
}

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <header class="bar">
        <button class="back" (click)="goBack()" aria-label="Back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="1.8"
              stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <h1>How Way2Wear works</h1>
      </header>

      <div class="carousel">
        <!-- Slide -->
        <div class="slide">
          <div class="img-slot">
            <img *ngIf="current().image" [src]="current().image" [alt]="current().title" />
            <div *ngIf="!current().image" class="placeholder">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="16" rx="2" stroke="#c0bdb8" stroke-width="1.5"/>
                <circle cx="8.5" cy="9.5" r="1.5" fill="#c0bdb8"/>
                <path d="M21 16l-5-5L5 20" stroke="#c0bdb8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>Screenshot here</span>
            </div>
          </div>

          <h2 class="slide-title">{{ current().title }}</h2>
          <p class="slide-body">{{ current().body }}</p>
        </div>

        <!-- Controls -->
        <div class="controls">
          <button class="arrow" (click)="prev()" [disabled]="index() === 0" aria-label="Previous">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>

          <div class="dots">
            <span class="dot" *ngFor="let s of slides; let i = index"
              [class.active]="i === index()" (click)="index.set(i)"></span>
          </div>

          <button class="arrow" (click)="next()" [disabled]="index() === slides.length - 1" aria-label="Next">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M9 5l7 7-7 7" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>

        <button class="done" *ngIf="index() === slides.length - 1" (click)="goBack()">
          Got it — start styling
        </button>
      </div>
    </div>
  `,
  styles: [`
    .page { max-width:480px; margin:0 auto; min-height:100vh; background:#fff; display:flex; flex-direction:column; }
    .bar { display:flex; align-items:center; gap:12px; padding:16px;
      border-bottom:1px solid rgba(0,0,0,.06); position:sticky; top:0; background:#fff; z-index:5; }
    .bar h1 { font-size:1.15rem; font-weight:700; margin:0; }
    .back { background:none; border:none; cursor:pointer; color:#1a1a1a; padding:4px; display:flex; }

    .carousel { flex:1; display:flex; flex-direction:column; padding:24px 20px 28px; }
    .slide { flex:1; display:flex; flex-direction:column; }
    .img-slot { width:100%; aspect-ratio:9/14; max-height:48vh; border-radius:18px; overflow:hidden;
      background:#f6f5f2; border:1px solid rgba(0,0,0,.06); display:flex; align-items:center;
      justify-content:center; margin:0 auto 22px; }
    .img-slot img { width:100%; height:100%; object-fit:contain; }
    .placeholder { display:flex; flex-direction:column; align-items:center; gap:8px; color:#aeacaa; font-size:.82rem; }

    .slide-title { font-size:1.25rem; font-weight:700; margin:0 0 8px; text-align:center; }
    .slide-body { font-size:.95rem; color:#6b6869; line-height:1.6; margin:0; text-align:center; }

    .controls { display:flex; align-items:center; justify-content:space-between; margin-top:22px; }
    .arrow { width:46px; height:46px; border-radius:50%; border:1px solid rgba(0,0,0,.1);
      background:#fff; cursor:pointer; color:#1a1a1a; display:flex; align-items:center; justify-content:center;
      transition:all .15s; }
    .arrow:disabled { opacity:.3; cursor:default; }
    .arrow:not(:disabled):active { transform:scale(.92); background:#f6f5f2; }
    .dots { display:flex; gap:7px; }
    .dot { width:8px; height:8px; border-radius:50%; background:#dcd9d3; cursor:pointer; transition:all .2s; }
    .dot.active { background:#c79a4b; width:22px; border-radius:5px; }

    .done { margin-top:22px; width:100%; padding:14px; border:none; border-radius:12px;
      background:#1a1a1a; color:#fff; font-size:.95rem; font-weight:600; cursor:pointer; }
  `],
})
export class HelpPage {
  private router = inject(Router);
  index = signal(0);
  current = () => this.slides[this.index()];

  // ── Edit these: put your screenshot paths in `image`, leave '' for placeholder ──
  slides: HelpSlide[] = [
    {
      title: 'Tell us the occasion',
      body: 'Type what you need in plain words — “outfit for my brother’s wedding under ₹3000” or just “date night look”. Way2Wear understands natural language, in your own language too.',
      image: '',
    },
    {
      title: 'Get complete outfit pairs',
      body: 'The AI returns three full looks — a top and bottom that go together — with a quick note on which shoes to pair. Prices are shown in ₹.',
      image: '',
    },
    {
      title: 'See the details',
      body: 'Tap “View Details” on any look to see full images, individual buy links, and to like or save the outfit.',
      image: '',
    },
    {
      title: 'Save & like what you love',
      body: 'Saved outfits and liked products are kept in your profile — reach them anytime from Saved Looks and Likes.',
      image: '',
    },
    {
      title: 'Set your style once',
      body: 'In Account Settings add your gender, age, height, skin tone, fit and budget. Every suggestion is then tailored to you automatically.',
      image: '',
    },
  ];

  prev() { if (this.index() > 0) this.index.update(i => i - 1); }
  next() { if (this.index() < this.slides.length - 1) this.index.update(i => i + 1); }
  goBack() { this.router.navigate(['/login']); }
}
