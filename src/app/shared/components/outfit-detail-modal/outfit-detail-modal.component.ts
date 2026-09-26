/**
 * Shows:
 * - Full outfit breakdown
 * - Product images (top, bottom, shoes)
 * - Preview button to generate AI image
 * - Shopping links
 */

import { Component, Input, Output, EventEmitter, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SavedService } from '@core/services/saved.service';
import { Outfit, OutfitItem } from '../../../core/models/message.model';
export type { Outfit, OutfitItem };
@Component({
  selector: 'app-outfit-detail-modal',
  templateUrl: './outfit-detail-modal.component.html',
  styleUrls: ['./outfit-detail-modal.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class OutfitDetailModalComponent implements OnInit {
  @Input() outfit: any;  // The outfit object
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() previewImage = new EventEmitter<any>();  // Emit when preview clicked
  private savedSvc = inject(SavedService);
  saved = signal(false);
  liked = signal<Record<string, boolean>>({});

  isGeneratingImage = false;

  constructor(private router: Router) {}

  ngOnInit() {
  }

  /**
   * Close modal
   */
  parts() {
    return [
      { label: 'Top', item: this.outfit?.top },
      { label: 'Bottom', item: this.outfit?.bottom },
    ];
  }
  closeModal() {
    this.close.emit();
  }
  onImgErr(e: Event, item: OutfitItem | undefined) {
    (e.target as HTMLImageElement).style.display = 'none';
    if (item) item.image = undefined;
  }

  /**
   * User clicks "Preview" button
   * Navigate to image preview page with outfit data
   */
  async onPreviewClick() {
    if (!this.outfit) {
      console.error('No outfit data');
      return;
    }

    // Navigate to image preview page with outfit data
    await this.router.navigate(['/outfit-preview'], {
      state: {
        outfit: this.outfit,
      },
    });

    // Close modal after navigation
    this.closeModal();
  }

  /**
   * Open shopping link
   */
  openShoppingLink(url: string) {
    if (url) {
      window.open(url, '_blank');
    }
  }

  /**
   * Get outfit text for DALL-E prompt
   * Used when generating preview image
   */
  getOutfitPrompt(): string {
    const outfit = this.outfit;
    
    if (outfit.full_outfit_text) {
      return outfit.full_outfit_text;
    }

    // Fallback: construct from top + bottom
    const top = outfit.top?.title || 'top';
    const bottom = outfit.bottom?.title || 'bottom';
    
    return `${top} + ${bottom}`;
  }

  /**
   * Get outfit summary for display
   */
  getOutfitSummary(): string {
    return this.outfit.name || this.getOutfitPrompt();
  }

  async toggleSave() {
    if (this.saved()) return;
    try {
      await this.savedSvc.saveOutfit(this.outfit);
      this.saved.set(true);
    } catch {}
  }
 
  async toggleLike(part: { label: string; item: OutfitItem | undefined }) {
    if (!part.item) return;
    const map = { ...this.liked() };
    if (map[part.label]) return;
    map[part.label] = true;
    this.liked.set(map);
    try {
      await this.savedSvc.likeProduct(part.item, (this.outfit as any).name);
    } catch {}
  }
}
