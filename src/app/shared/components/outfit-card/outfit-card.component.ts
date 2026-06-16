import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Outfit } from '../../../core/models/message.model';

@Component({
  selector: 'app-outfit-card',
  templateUrl: './outfit-card.component.html',
  styleUrls: ['./outfit-card.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class OutfitCardComponent {
  @Input({ required: true }) outfit!: Outfit;
  @Input() index: number = 0;
  @Output() viewDetails = new EventEmitter<Outfit>();

  imgErrors: Record<string, boolean> = {};

  getSwatchBg(color: string | undefined): string {
    return this.hexToRgba(color || '#888888', 0.15);
  }

  onImgError(key: string) {
    this.imgErrors[key] = true;
  }

  hasImgError(key: string): boolean {
    return !!this.imgErrors[key];
  }

  private hexToRgba(hex: string, alpha: number): string {
    try {
      const h = (hex || '#888888').replace('#', '');
      const r = parseInt(h.substring(0, 2), 16);
      const g = parseInt(h.substring(2, 4), 16);
      const b = parseInt(h.substring(4, 6), 16);
      return `rgba(${r},${g},${b},${alpha})`;
    } catch {
      return 'rgba(200,200,200,0.15)';
    }
  }
}