/**
 * Purpose:
 * - Fetch product images from URLs
 * - Convert images to Base64
 * - Extract color information from images
 * - Cache converted images
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

interface ProductImageData {
  base64: string;
  mimeType: string;
  width: number;
  height: number;
  dominantColor?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProductImageService {
  private imageCache = new Map<string, ProductImageData>();

  constructor(private http: HttpClient) {}

  /**
   * Fetch image and convert to base64
   */
  async imageToBase64(imageUrl: string): Promise<ProductImageData | null> {
    try {
      // Check cache first
      if (this.imageCache.has(imageUrl)) {
        return this.imageCache.get(imageUrl) || null;
      }

      // Fetch image as blob
      const blob = await firstValueFrom(
        this.http.get(imageUrl, { responseType: 'blob' })
      );

      // Convert to base64
      const base64 = await this.blobToBase64(blob);
      const mimeType = blob.type || 'image/png';

      // Get image dimensions
      const { width, height } = await this.getImageDimensions(base64);

      // Extract dominant color
      const dominantColor = await this.extractDominantColor(base64);

      const imageData: ProductImageData = {
        base64,
        mimeType,
        width,
        height,
        dominantColor,
      };

      // Cache it
      this.imageCache.set(imageUrl, imageData);

      return imageData;
    } catch (error) {
      console.error(`Failed to convert image ${imageUrl}:`, error);
      return null;
    }
  }

  /**
   * Convert blob to base64
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Remove "data:image/png;base64," prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Get image dimensions
   */
  private getImageDimensions(
    base64: string
  ): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => {
        resolve({ width: 0, height: 0 });
      };
      img.src = `data:image/png;base64,${base64}`;
    });
  }

  /**
   * Extract dominant color from image (simple algorithm)
   */
  private extractDominantColor(base64: string): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve('#000000');
            return;
          }

          canvas.width = 1;
          canvas.height = 1;
          ctx.drawImage(img, 0, 0, 1, 1);

          const imageData = ctx.getImageData(0, 0, 1, 1);
          const data = imageData.data;

          const hex =
            '#' +
            [data[0], data[1], data[2]]
              .map((x) => {
                const hex = x.toString(16);
                return hex.length === 1 ? '0' + hex : hex;
              })
              .join('')
              .toUpperCase();

          resolve(hex);
        } catch {
          resolve('#000000');
        }
      };
      img.onerror = () => resolve('#000000');
      img.src = `data:image/png;base64,${base64}`;
    });
  }

  /**
   * Get multiple images
   */
  async getMultipleImages(
    imageUrls: string[]
  ): Promise<Map<string, ProductImageData>> {
    const results = new Map<string, ProductImageData>();

    for (const url of imageUrls) {
      const imageData = await this.imageToBase64(url);
      if (imageData) {
        results.set(url, imageData);
      }
    }

    return results;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.imageCache.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.imageCache.size;
  }
}
