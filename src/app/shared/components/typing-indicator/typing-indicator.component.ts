import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-typing-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="typing-row">
      <div class="ai-avatar">W</div>
      <div class="loading-pill">
        <span class="shimmer">{{ current() }}</span>
        <span class="dots"><i></i><i></i><i></i></span>
      </div>
    </div>
  `,
  styles: [`
    .typing-row { display:flex; gap:10px; margin-bottom:20px; align-items:center; animation:fade .3s ease; }
    .ai-avatar { width:30px; height:30px; border-radius:50%; background:#1a1a1a; color:#c79a4b;
      font-size:11px; font-weight:700; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
    .loading-pill { display:flex; align-items:center; gap:8px; background:#f6f5f2;
      border:1px solid rgba(0,0,0,0.06); border-radius:16px; padding:9px 14px; }
    .shimmer { font-size:13.5px; color:#6b6869; font-weight:500;
      background:linear-gradient(90deg,#6b6869 25%,#c79a4b 50%,#6b6869 75%);
      background-size:200% 100%; -webkit-background-clip:text; background-clip:text;
      animation:shine 2s linear infinite; }
    @keyframes shine { to { background-position:-200% 0; } }
    .dots { display:flex; gap:3px; }
    .dots i { width:5px; height:5px; border-radius:50%; background:#c0bdb8; animation:bounce 1.3s infinite; }
    .dots i:nth-child(2){ animation-delay:.2s; } .dots i:nth-child(3){ animation-delay:.4s; }
    @keyframes bounce { 0%,60%,100%{transform:translateY(0);} 30%{transform:translateY(-5px);} }
    @keyframes fade { from{opacity:0;} to{opacity:1;} }
  `],
})
export class TypingIndicatorComponent implements OnInit, OnDestroy {
  private messages = [
    'Styling the perfect look for you…',
    'Mixing colours that turn heads…',
    'Finding your best outfit match…',
    'Pairing tops and bottoms with care…',
    'Almost there — fashion magic loading…',
    'Curating looks just for you…',
    'Your stylist is working their magic…',
  ];
  current = signal(this.messages[0]);
  private timer: any;
  private i = 0;

  ngOnInit() {
    this.timer = setInterval(() => {
      this.i = (this.i + 1) % this.messages.length;
      this.current.set(this.messages[this.i]);
    }, 2200);
  }
  ngOnDestroy() { if (this.timer) clearInterval(this.timer); }
}
