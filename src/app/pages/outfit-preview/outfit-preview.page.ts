import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';

import { OutfitService } from '../../core/services/outfit.service';
import { UserService } from '../../core/services/user.service';

/**
 * Shape of the outfit object that arrives via router state.
 * Matches OutfitApi from chat.service.ts (top / bottom / shoe_note / accessory).
 */
interface OutfitShape {
  top?: { title?: string; image?: string; color?: string; brand?: string; price?: number };
  bottom?: { title?: string; image?: string; color?: string; brand?: string; price?: number };
  shoe_note?: any;
  accessory?: any;
  occasion?: string;
}

/**
 * Full request payload the backend expects. Every field is populated for
 * real (or explicitly null) — nothing is left out, which is what was
 * causing every image/profile field to silently default to null before.
 */
interface GenerateOutfitRequest {
  outfit_description: string;
  style_hint: string;
  user_context: string;
  use_cache: boolean;
  person_image: string | null;
  product_top_image: string | null;
  product_bottom_image: string | null;
  refinement_instructions: string;
  user_skin_tone: string | null;
  user_height: string | null;
  user_occasion: string | null;
  user_color_preference: string[];
}

interface GenerateOutfitResponse {
  success: boolean;
  image_url?: string;
  error?: string;
}

@Component({
  selector: 'app-outfit-preview',
  templateUrl: './outfit-preview.page.html',
  styleUrls: ['./outfit-preview.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
})
export class OutfitPreviewPage implements OnInit {
  private router = inject(Router);
  private outfitService = inject(OutfitService);
  private userService = inject(UserService);
  private toastController = inject(ToastController);

  // ── Outfit data (from router state) ──────────────────
  outfit: OutfitShape | any = null;
  occasion = '';
  outfitDescription = '';

  // ── Image / generation state ──────────────────────────
  currentImageUrl = '';
  isGenerating = false;
  imageLoadError = false;

  // ── Edit bar ───────────────────────────────────────────
  editPrompt = '';
  

  constructor() {
    // getCurrentNavigation() is only populated during the navigation itself,
    // so this has to run in the constructor, not ngOnInit.
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state as any;

    if (state?.['outfit']) {
      this.outfit = state['outfit'];
    }
    this.occasion = state?.['occasion'] || this.outfit?.occasion || '';
  }

  ngOnInit(): void {
    if (!this.outfit) {
      this.showToast('No outfit data provided', 'danger');
      setTimeout(() => this.goBack(), 1500);
      return;
    }

    this.buildOutfitDescription();

    if (!this.outfitDescription) {
      this.showToast('Could not read outfit details', 'danger');
      return;
    }

    this.generateImage();
  }

  /**
   * Builds a readable description from the outfit's items.
   * Preserved exactly as-is — this part was already working correctly.
   */
  private buildOutfitDescription(): void {
    if (!this.outfit) return;
    const parts: string[] = [];

    if (Array.isArray(this.outfit)) {
      this.outfit.forEach((item: any) => {
        if (item?.title) parts.push(item.title);
      });
    } else if (typeof this.outfit === 'object') {
      if (this.outfit.top?.title) parts.push(this.outfit.top.title);
      if (this.outfit.bottom?.title) parts.push(this.outfit.bottom.title);
      if (this.outfit.shoe_note?.title) parts.push(this.outfit.shoe_note.title);
      if (this.outfit.accessory?.title) parts.push(this.outfit.accessory.title);
    }

    this.outfitDescription = parts.join(' + ');
  }

  // ═══════════════════════════════════════════════════════
  // GENERATE (first image)
  // ═══════════════════════════════════════════════════════
  async generateImage(): Promise<void> {
    if (this.isGenerating || !this.outfitDescription) return;

    this.isGenerating = true;
    this.imageLoadError = false;

    try {
      const request = this.buildRequest('');
      const response = (await this.outfitService
        .generateOutfitImage(request)
        .toPromise()) as GenerateOutfitResponse | undefined;

      if (response?.success && response.image_url) {
        this.currentImageUrl = response.image_url;
        this.imageLoadError = false;
      } else {
        this.imageLoadError = true;
        this.showToast(response?.error || 'Failed to generate image', 'danger');
      }
    } catch (error) {
      console.error('Error generating image:', error);
      this.imageLoadError = true;
      this.showToast('Failed to generate image. Please try again.', 'danger');
    } finally {
      this.isGenerating = false;
    }
  }

  // ═══════════════════════════════════════════════════════
  // EDIT (regenerate with the prompt typed in the bottom bar)
  // ═══════════════════════════════════════════════════════
  async regenerateWithEdit(): Promise<void> {
    const prompt = this.editPrompt.trim();
    if (!prompt || this.isGenerating || !this.currentImageUrl) return;

    this.isGenerating = true;

    try {
      const request = this.buildRequest(prompt);
      const response = (await this.outfitService
        .regenerateOutfitImage(request)
        .toPromise()) as GenerateOutfitResponse | undefined;

      if (response?.success && response.image_url) {
        this.currentImageUrl = response.image_url;
        this.editPrompt = '';
      } else {
        this.showToast(response?.error || 'Failed to update image', 'danger');
      }
    } catch (error) {
      console.error('Error regenerating image:', error);
      this.showToast('Failed to update image. Please try again.', 'danger');
    } finally {
      this.isGenerating = false;
    }
  }

  /**
   * Builds the full request payload.
   *
   * Image fields are sent as raw references, not converted here — the
   * browser can't read the bytes of a cross-origin image (Amazon's CDN
   * blocks it via CORS, even though <img> renders it fine), so that
   * conversion now happens server-side instead. See
   * app/services/image_fetch_service.py — it accepts either an
   * already-base64 data URL (the profile avatar, from a local upload)
   * or a plain http(s) URL (product photos) and resolves both.
   */
  private buildRequest(refinement: string): GenerateOutfitRequest {
    const profile = this.userService.profile();

    return {
      outfit_description: this.outfitDescription,
      style_hint: 'luxury fashion photography, professional styling',
      user_context: `Occasion: ${this.occasion || 'general'}`,
      use_cache: true,
      person_image: profile.avatarUrl ?? null,
      product_top_image: this.outfit?.top?.image ?? null,
      product_bottom_image: this.outfit?.bottom?.image ?? null,
      refinement_instructions: refinement,
      user_skin_tone: profile.skinTone ?? null,
      user_height: profile.heightCm ? `${profile.heightCm}cm` : null,
      user_occasion: this.occasion || null,
      user_color_preference: [],
    };
  }

  // ═══════════════════════════════════════════════════════
  // Header actions
  // ═══════════════════════════════════════════════════════
  async downloadImage(): Promise<void> {
    if (!this.currentImageUrl) return;
    const link = document.createElement('a');
    link.href = this.currentImageUrl;
    link.download = `way2wear-outfit-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async shareImage(): Promise<void> {
    if (!this.currentImageUrl) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Way2Wear Outfit',
          text: `Check out this outfit: ${this.outfitDescription}`,
          url: this.currentImageUrl,
        });
      } else {
        await navigator.clipboard.writeText(this.currentImageUrl);
        this.showToast('Link copied to clipboard!', 'success');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  }

  goBack(): void {
    this.router.navigate(['/chat'], { replaceUrl: true });
  }

  onImageLoad(): void {
    this.imageLoadError = false;
  }

  onImageError(): void {
    this.imageLoadError = true;
  }

  private async showToast(message: string, color: 'danger' | 'success' = 'danger'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: color === 'danger' ? 2500 : 1800,
      position: 'bottom',
      color,
    });
    await toast.present();
  }
}