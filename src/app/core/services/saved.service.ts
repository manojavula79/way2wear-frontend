import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SavedRow {
  id: string;
  product_title: string;
  brand?: string;
  price?: number;
  color?: string;
  image?: string;
  affiliate_url?: string;
  outfit_name?: string;
  created_at?: string;
}

@Injectable({ providedIn: 'root' })
export class SavedService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/products`;

  // ── Reactive state the whole app can read ──
  savedItems = signal<SavedRow[]>([]);
  likedItems = signal<SavedRow[]>([]);
  savedCount = signal(0);
  likedCount = signal(0);

  // ── Save / Like ──
  async saveOutfit(outfit: any) {
    const res = await firstValueFrom(this.http.post(`${this.base}/save`, {
      kind: 'save',
      product_title: outfit.name,
      brand: outfit.top?.brand,
      price: (outfit.top?.price || 0) + (outfit.bottom?.price || 0),
      color: outfit.top?.color,
      image: outfit.top?.image,
      affiliate_url: outfit.top?.url,
      outfit_name: outfit.name,
    }).pipe(timeout(12000)));
    await this.refreshSaved();
    return res;
  }

  async likeProduct(item: any, outfitName: string) {
    const res = await firstValueFrom(this.http.post(`${this.base}/like`, {
      kind: 'like',
      product_title: item.title,
      brand: item.brand,
      price: item.price,
      color: item.color,
      image: item.image,
      affiliate_url: item.url,
      outfit_name: outfitName,
    }).pipe(timeout(12000)));
    await this.refreshLiked();
    return res;
  }

  // ── Fetch lists (also updates counts) ──
  async refreshSaved() {
    try {
      const rows = await firstValueFrom(
        this.http.get<SavedRow[]>(`${this.base}/saved`).pipe(timeout(12000))
      );
      this.savedItems.set(rows || []);
      this.savedCount.set((rows || []).length);
    } catch { /* keep existing */ }
  }

  async refreshLiked() {
    try {
      const rows = await firstValueFrom(
        this.http.get<SavedRow[]>(`${this.base}/liked`).pipe(timeout(12000))
      );
      this.likedItems.set(rows || []);
      this.likedCount.set((rows || []).length);
    } catch { /* keep existing */ }
  }

  /** Call once on app/profile load to populate both counts. */
  async refreshAll() {
    await Promise.all([this.refreshSaved(), this.refreshLiked()]);
  }

  // ── Remove ──
  async unsave(id: string) {
    await firstValueFrom(this.http.delete(`${this.base}/save/${id}`).pipe(timeout(12000)));
    this.savedItems.update(list => list.filter(r => r.id !== id));
    this.savedCount.set(this.savedItems().length);
  }

  async unlike(id: string) {
    await firstValueFrom(this.http.delete(`${this.base}/like/${id}`).pipe(timeout(12000)));
    this.likedItems.update(list => list.filter(r => r.id !== id));
    this.likedCount.set(this.likedItems().length);
  }
}
