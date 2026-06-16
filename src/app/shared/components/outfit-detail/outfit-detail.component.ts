import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SavedService } from '../../../core/services/saved.service';
import { Outfit, OutfitItem } from '../../../core/models/message.model';

export type { Outfit, OutfitItem };

@Component({
  selector: 'app-outfit-detail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="overlay" (click)="close.emit()"></div>
    <div class="sheet">
      <button class="close-x" (click)="close.emit()" aria-label="Close">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      </button>

      <div class="sheet-body">
        <h2 class="o-name">{{ outfit.name }}</h2>
        <p class="o-note" *ngIf="outfit.note">{{ outfit.note }}</p>

        <div class="item-block" *ngFor="let part of parts()">
          <div class="img-wrap">
            <img *ngIf="part.item.image" [src]="part.item.image" [alt]="part.item.title"
              (error)="onImgErr($event, part.item)" />
            <div *ngIf="!part.item.image" class="swatch" [style.background]="part.item.color || '#ddd'"></div>
            <span class="tag">{{ part.label }}</span>
          </div>
          <div class="item-info">
            <p class="i-title">{{ part.item.title }}</p>
            <p class="i-brand" *ngIf="part.item.brand">{{ part.item.brand }}</p>
            <p class="i-price" *ngIf="part.item.price">₹{{ part.item.price }}</p>
            <div class="row-btns">
              <a class="buy-btn" [href]="part.item.url || '#'" target="_blank" rel="noopener noreferrer">
                Buy this {{ part.label | lowercase }}
              </a>
              <button class="like-btn" [class.on]="liked()[part.label]"
                (click)="toggleLike(part)" aria-label="Like">
                <svg width="18" height="18" viewBox="0 0 24 24"
                  [attr.fill]="liked()[part.label] ? '#dc3545' : 'none'">
                  <path d="M12 20s-7-4.5-7-10a4 4 0 017-2 4 4 0 017 2c0 5.5-7 10-7 10z"
                    stroke="#dc3545" stroke-width="1.6" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div class="shoe-note" *ngIf="outfit.shoe_note">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M3 17h14l4-3-2-4-5 1-4-4-7 4v6z" stroke="#c79a4b" stroke-width="1.5" stroke-linejoin="round"/>
          </svg>
          <span>{{ outfit.shoe_note }}</span>
        </div>

        <button class="save-outfit" [class.saved]="saved()" (click)="toggleSave()">
          <svg width="18" height="18" viewBox="0 0 24 24" [attr.fill]="saved() ? '#1a1a1a' : 'none'">
            <path d="M6 3h12a1 1 0 011 1v17l-7-4-7 4V4a1 1 0 011-1z" stroke="#1a1a1a" stroke-width="1.6" stroke-linejoin="round"/>
          </svg>
          {{ saved() ? 'Saved' : 'Save this outfit' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .overlay { position:fixed; inset:0; background:rgba(0,0,0,.4); z-index:1000; animation:fade .2s; }
    .sheet { position:fixed; left:0; right:0; bottom:0; z-index:1001; max-width:480px; margin:0 auto;
      background:#fff; border-radius:20px 20px 0 0; max-height:90vh; overflow-y:auto;
      animation:slideUp .3s cubic-bezier(.32,.72,0,1); }
    @keyframes fade { from{opacity:0;} to{opacity:1;} }
    @keyframes slideUp { from{transform:translateY(100%);} to{transform:translateY(0);} }
    .close-x { position:sticky; top:12px; left:calc(100% - 44px); background:#f6f5f2; border:none;
      width:34px; height:34px; border-radius:50%; cursor:pointer; color:#1a1a1a;
      display:flex; align-items:center; justify-content:center; }
    .sheet-body { padding:0 20px 28px; }
    .o-name { font-size:1.3rem; font-weight:700; margin:0 0 4px; }
    .o-note { font-size:.9rem; color:#6b6869; margin:0 0 18px; line-height:1.5; }
    .item-block { display:flex; gap:14px; padding:14px 0; border-top:1px solid rgba(0,0,0,.06); }
    .img-wrap { position:relative; width:120px; height:150px; border-radius:12px; overflow:hidden;
      background:#f6f5f2; flex-shrink:0; }
    .img-wrap img { width:100%; height:100%; object-fit:cover; }
    .swatch { width:100%; height:100%; }
    .tag { position:absolute; top:8px; left:8px; background:#1a1a1a; color:#fff; font-size:10px;
      font-weight:700; letter-spacing:.5px; padding:3px 8px; border-radius:5px; text-transform:uppercase; }
    .item-info { flex:1; display:flex; flex-direction:column; }
    .i-title { font-size:.95rem; font-weight:500; margin:0 0 2px; }
    .i-brand { font-size:.8rem; color:#8a8a8a; margin:0 0 6px; }
    .i-price { font-size:1.05rem; font-weight:700; margin:0 0 auto; }
    .row-btns { display:flex; gap:8px; align-items:center; margin-top:10px; }
    .buy-btn { flex:1; background:#1a1a1a; color:#fff; text-decoration:none; text-align:center;
      font-size:.82rem; font-weight:600; padding:9px; border-radius:9px; }
    .like-btn { width:38px; height:38px; border:1px solid rgba(0,0,0,.1); border-radius:9px;
      background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .like-btn.on { border-color:#dc3545; background:rgba(220,53,69,.06); }
    .shoe-note { display:flex; gap:8px; align-items:center; background:rgba(199,154,75,.08);
      border:1px solid rgba(199,154,75,.3); border-radius:10px; padding:10px 14px; margin-top:16px;
      font-size:.85rem; color:#7a5c1a; line-height:1.4; }
    .save-outfit { width:100%; margin-top:18px; padding:13px; border:1px solid #1a1a1a; border-radius:11px;
      background:#fff; color:#1a1a1a; font-size:.95rem; font-weight:600; cursor:pointer;
      display:flex; align-items:center; justify-content:center; gap:8px; }
    .save-outfit.saved { background:#1a1a1a; color:#fff; }
    .save-outfit.saved svg path { stroke:#fff; }
  `],
})
export class OutfitDetailComponent {
  @Input() outfit!: Outfit;
  @Output() close = new EventEmitter<void>();

  private savedSvc = inject(SavedService);
  saved = signal(false);
  liked = signal<Record<string, boolean>>({});

  parts() {
    return [
      { label: 'Top', item: this.outfit.top },
      { label: 'Bottom', item: this.outfit.bottom },
    ];
  }

  onImgErr(e: Event, item: OutfitItem) {
    (e.target as HTMLImageElement).style.display = 'none';
    item.image = undefined;
  }

  async toggleSave() {
    if (this.saved()) return;
    try { await this.savedSvc.saveOutfit(this.outfit); this.saved.set(true); } catch {}
  }

  async toggleLike(part: { label: string; item: OutfitItem }) {
    const map = { ...this.liked() };
    if (map[part.label]) return;
    map[part.label] = true;
    this.liked.set(map);
    try { await this.savedSvc.likeProduct(part.item, this.outfit.name); } catch {}
  }
}