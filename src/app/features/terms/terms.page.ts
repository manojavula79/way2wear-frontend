import { Component, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';

@Component({
  selector: 'app-terms',
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
        <h1>Terms & Conditions</h1>
      </header>

      <div class="content">
        <p class="updated">Last updated: June 2026</p>

        <h2>1. Acceptance of terms</h2>
        <p>By creating an account or using Way2Wear, you agree to these Terms. If you do not agree, please do not use the app.</p>

        <h2>2. What Way2Wear does</h2>
        <p>Way2Wear is an AI fashion assistant that suggests outfit combinations based on your prompts and profile. Suggestions are for guidance only; styling is subjective and we do not guarantee any specific result.</p>

        <h2>3. Your account</h2>
        <p>You sign in using your phone number and a one-time password. You are responsible for keeping access to your phone secure. You must be old enough to use the service under the laws of your country.</p>

        <h2>4. Shopping links</h2>
        <p>Product links may direct you to third-party retailers. Way2Wear may earn an affiliate commission on purchases at no extra cost to you. Prices, availability and product details are controlled by the retailer, not by us, and may change at any time.</p>

        <h2>5. Your content</h2>
        <p>Messages, feedback and profile details you provide are used to personalise your suggestions and improve the service. Do not submit unlawful, offensive or infringing content.</p>

        <h2>6. AI limitations</h2>
        <p>The AI can make mistakes. Always review important details — such as size, price and return policy — on the retailer’s page before purchasing.</p>

        <h2>7. Privacy</h2>
        <p>We collect your phone number and the profile and styling information you choose to provide. We use it to operate and personalise the service and do not sell your personal data.</p>

        <h2>8. Changes</h2>
        <p>We may update these Terms from time to time. Continued use after an update means you accept the revised Terms.</p>

        <h2>9. Contact</h2>
        <p>For questions about these Terms, reach out through the Contact option in your profile.</p>

        <div class="spacer"></div>
      </div>
    </div>
  `,
  styles: [`
    .page { max-width:480px; margin:0 auto; min-height:100vh; background:#fff; }
    .bar { display:flex; align-items:center; gap:12px; padding:16px;
      border-bottom:1px solid rgba(0,0,0,.06); position:sticky; top:0; background:#fff; z-index:5; }
    .bar h1 { font-size:1.15rem; font-weight:700; margin:0; }
    .back { background:none; border:none; cursor:pointer; color:#1a1a1a; padding:4px; display:flex; }
    .content { padding:20px 20px 40px; }
    .updated { font-size:.8rem; color:#aeacaa; margin:0 0 20px; }
    h2 { font-size:1rem; font-weight:700; margin:22px 0 6px; }
    p { font-size:.92rem; color:#4a4a4a; line-height:1.65; margin:0 0 4px; }
    .spacer { height:20px; }
  `],
})
export class TermsPage {
  private location = inject(Location);
  goBack() { this.location.back(); }
}
