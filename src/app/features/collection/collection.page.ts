import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SavedService, SavedRow } from '../../core/services/saved.service';

type Mode = 'saved' | 'liked';

@Component({
  selector: 'app-collection',
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
        <h1>{{ mode() === 'saved' ? 'Saved Looks' : 'Liked Products' }}</h1>
        <span class="count" *ngIf="rows().length">{{ rows().length }}</span>
      </header>

      <!-- Empty -->
      <div class="empty" *ngIf="!loading() && rows().length === 0">
        <div class="empty-icon">{{ mode() === 'saved' ? '🔖' : '♡' }}</div>
        <p class="empty-title">
          {{ mode() === 'saved' ? 'No saved looks yet' : 'No liked products yet' }}
        </p>
        <p class="empty-sub">
          {{ mode() === 'saved'
              ? 'Tap “Save this outfit” on any look to keep it here.'
              : 'Tap the ♡ on a product to add it here.' }}
        </p>
        <button class="cta" (click)="goHome()">Start styling</button>
      </div>

      <!-- Loading -->
      <div class="loading" *ngIf="loading()">
        <div class="spinner"></div>
      </div>

      <!-- List -->
      <div class="list" *ngIf="!loading() && rows().length">
        <div class="item" *ngFor="let r of rows()">
          <div class="thumb">
            <img *ngIf="r.image" [src]="r.image" [alt]="r.product_title"
              (error)="onImgErr($event)" />
            <div *ngIf="!r.image" class="swatch" [style.background]="r.color || '#e5e2dc'"></div>
          </div>

          <div class="info">
            <p class="title">{{ r.product_title }}</p>
            <p class="brand" *ngIf="r.brand">{{ r.brand }}</p>
            <p class="price" *ngIf="r.price">₹{{ r.price }}</p>
          </div>

          <div class="actions">
            <a class="buy" *ngIf="r.affiliate_url" [href]="r.affiliate_url"
              target="_blank" rel="noopener noreferrer">Buy</a>
            <button class="remove" (click)="remove(r)" aria-label="Remove">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor"
                  stroke-width="1.7" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { max-width:480px; margin:0 auto; min-height:100vh; background:#fff; }
    .bar { display:flex; align-items:center; gap:12px; padding:16px 16px 14px;
      border-bottom:1px solid rgba(0,0,0,.06); position:sticky; top:0; background:#fff; z-index:5; }
    .bar h1 { font-size:1.15rem; font-weight:700; margin:0; flex:1; }
    .back { background:none; border:none; cursor:pointer; color:#1a1a1a; padding:4px;
      display:flex; align-items:center; }
    .count { background:#f0eee9; color:#6b6869; font-size:.78rem; font-weight:700;
      padding:3px 10px; border-radius:20px; }

    .empty { text-align:center; padding:80px 32px; }
    .empty-icon { font-size:46px; margin-bottom:14px; }
    .empty-title { font-size:1.05rem; font-weight:600; margin:0 0 6px; }
    .empty-sub { font-size:.88rem; color:#8a8a8a; margin:0 0 22px; line-height:1.5; }
    .cta { background:#1a1a1a; color:#fff; border:none; border-radius:11px;
      padding:12px 28px; font-size:.9rem; font-weight:600; cursor:pointer; }

    .loading { display:flex; justify-content:center; padding:80px; }
    .spinner { width:30px; height:30px; border:3px solid #eee; border-top-color:#c79a4b;
      border-radius:50%; animation:spin .8s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }

    .list { padding:8px 14px 28px; display:flex; flex-direction:column; gap:10px; }
    .item { display:flex; gap:12px; align-items:center; padding:10px;
      border:1px solid rgba(0,0,0,.07); border-radius:14px; }
    .thumb { width:64px; height:80px; border-radius:10px; overflow:hidden;
      background:#f6f5f2; flex-shrink:0; }
    .thumb img { width:100%; height:100%; object-fit:cover; }
    .swatch { width:100%; height:100%; }
    .info { flex:1; min-width:0; }
    .title { font-size:.92rem; font-weight:500; margin:0 0 2px;
      overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .brand { font-size:.78rem; color:#8a8a8a; margin:0 0 4px; }
    .price { font-size:.95rem; font-weight:700; margin:0; }
    .actions { display:flex; flex-direction:column; gap:8px; align-items:flex-end; }
    .buy { background:#1a1a1a; color:#fff; text-decoration:none; font-size:.75rem;
      font-weight:600; padding:6px 14px; border-radius:8px; }
    .remove { background:#f6f5f2; border:none; width:32px; height:32px; border-radius:8px;
      cursor:pointer; color:#8a8a8a; display:flex; align-items:center; justify-content:center; }
    .remove:hover { color:#dc3545; }
  `],
})
export class CollectionPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private saved = inject(SavedService);

  mode = signal<Mode>('saved');
  loading = signal(true);

  rows = computed<SavedRow[]>(() =>
    this.mode() === 'saved' ? this.saved.savedItems() : this.saved.likedItems()
  );

  async ngOnInit() {
    const path = this.route.snapshot.routeConfig?.path;
    this.mode.set(path === 'liked' ? 'liked' : 'saved');
    this.loading.set(true);
    if (this.mode() === 'saved') await this.saved.refreshSaved();
    else await this.saved.refreshLiked();
    this.loading.set(false);
  }

  async remove(r: SavedRow) {
    if (this.mode() === 'saved') await this.saved.unsave(r.id);
    else await this.saved.unlike(r.id);
  }

  onImgErr(e: Event) { (e.target as HTMLImageElement).style.display = 'none'; }
  goBack() { this.router.navigate(['/home']); }
  goHome() { this.router.navigate(['/home']); }
}
