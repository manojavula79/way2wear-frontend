import { Component, Input, OnInit, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Message, OutfitResponse, Outfit } from '../../../core/models/message.model';
import { OutfitCardComponent } from '../outfit-card/outfit-card.component';
import { ChatService } from '../../../core/services/chat.service';

const INITIAL_COUNT = 3;
const INCREMENT = 3;
const MAX_COUNT = 12;

@Component({
  selector: 'app-message-bubble',
  templateUrl: './message-bubble.component.html',
  styleUrls: ['./message-bubble.component.scss'],
  standalone: true,
  imports: [CommonModule, OutfitCardComponent],
})
export class MessageBubbleComponent implements OnInit {
  @Input({ required: true }) message!: Message;
  @Output() viewDetails = new EventEmitter<Outfit>();

  Math = Math;
  parsedResponse: OutfitResponse | null = null;
  isUser = false;

    // Tracks how many outfits are currently visible: 3, 6, 9, 12
  visibleCount = signal(INITIAL_COUNT);

  // Slice of the full outfit list currently shown
  displayedOutfits = computed<Outfit[]>(() => {
    const outfits = this.parsedResponse?.outfits ?? [];
    return outfits.slice(0, this.visibleCount());
  });

  constructor(private chatService: ChatService) {}

  ngOnInit() {
    this.isUser = this.message.role === 'user';
    if (!this.isUser) {
      this.parsedResponse = this.chatService.parseResponse(this.message.content);
      // Reset visible count in case ngOnInit ever re-runs with a different message
      this.visibleCount.set(INITIAL_COUNT);
    }
  }
  
  loadMore(): void {
    const total = this.parsedResponse?.outfits.length ?? 0;
    const cap = Math.min(total, MAX_COUNT);
    this.visibleCount.update(current => Math.min(current + INCREMENT, cap));
  }

  hasMore(): boolean {
    const total = this.parsedResponse?.outfits.length ?? 0;
    const cap = Math.min(total, MAX_COUNT);
    return this.visibleCount() < cap;
  }
}