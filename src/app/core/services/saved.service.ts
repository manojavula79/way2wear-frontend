import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SavedService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/products`;

  saveOutfit(outfit: any) {
    return firstValueFrom(this.http.post(`${this.base}/save`, {
      kind: 'save',
      product_title: outfit.name,
      brand: outfit.top?.brand,
      price: (outfit.top?.price || 0) + (outfit.bottom?.price || 0),
      color: outfit.top?.color,
      image: outfit.top?.image,
      affiliate_url: outfit.top?.url,
      outfit_name: outfit.name,
    }).pipe(timeout(12000)));
  }

  likeProduct(item: any, outfitName: string) {
    return firstValueFrom(this.http.post(`${this.base}/like`, {
      kind: 'like',
      product_title: item.title,
      brand: item.brand,
      price: item.price,
      color: item.color,
      image: item.image,
      affiliate_url: item.url,
      outfit_name: outfitName,
    }).pipe(timeout(12000)));
  }

  getSaved() { return firstValueFrom(this.http.get<any[]>(`${this.base}/saved`).pipe(timeout(12000))); }
  getLiked() { return firstValueFrom(this.http.get<any[]>(`${this.base}/liked`).pipe(timeout(12000))); }
  unsave(id: string) { return firstValueFrom(this.http.delete(`${this.base}/save/${id}`).pipe(timeout(12000))); }
  unlike(id: string) { return firstValueFrom(this.http.delete(`${this.base}/like/${id}`).pipe(timeout(12000))); }
}
