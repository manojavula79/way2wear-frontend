import { Component, Input, OnInit, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Message, OutfitResponse, Outfit } from '../../../core/models/message.model';
import { OutfitCardComponent } from '../outfit-card/outfit-card.component';
import { ChatService } from '../../../core/services/chat.service';
import { ProfileFormComponent } from '../profile-form/profile-form.component';

const INITIAL_COUNT = 3;
const INCREMENT = 3;
const MAX_COUNT = 12;

@Component({
  selector: 'app-message-bubble',
  templateUrl: './message-bubble.component.html',
  styleUrls: ['./message-bubble.component.scss'],
  standalone: true,
  imports: [CommonModule, OutfitCardComponent, ProfileFormComponent],
})
export class MessageBubbleComponent implements OnInit {
  @Input({ required: true }) message!: Message;
  @Input() sessionId: string = '';
  @Output() viewDetails = new EventEmitter<Outfit>();
  @Output() formSubmit = new EventEmitter<any>();

  Math = Math;
  parsedResponse: OutfitResponse | null = null;
  isUser = false;
  isProfileForm = false;
  profileFormData: any = null;
  displayedOutfits = signal<Outfit[]>([]);

  // Tracks how many outfits are currently visible: 3, 6, 9, 12
  visibleCount = signal(INITIAL_COUNT);

  // Slice of the full outfit list currently shown
  // displayedOutfits = computed<Outfit[]>(() => {
  //   const outfits = this.parsedResponse?.outfits ?? [];
  //   return outfits.slice(0, this.visibleCount());
  // });

  constructor(private chatService: ChatService) {}

  // ngOnInit() {
  //   this.isUser = this.message.role === 'user';
  //   if (!this.isUser) {
  //     this.parsedResponse = this.chatService.parseResponse(this.message.content);
  //     // Reset visible count in case ngOnInit ever re-runs with a different message
  //     this.visibleCount.set(INITIAL_COUNT);
  //   }
  // }
  ngOnInit() {
    this.isUser = this.message.role === 'user';
    
    if (!this.isUser) {
      // Check if this is a profile form response
      try {
        const parsed = JSON.parse(this.message.content);
        
        if (parsed.needs_form === true) {
          // This is a profile form message
          this.isProfileForm = true;
          this.profileFormData = parsed;
          console.log('Profile form detected:', parsed);
        } else {
          // Regular outfit response
          this.parsedResponse = this.chatService.parseResponse(this.message.content);
          if (this.parsedResponse) {
            this.updateDisplayed();
          }
        }
      } catch {
        // Not JSON, treat as regular text
        this.parsedResponse = this.chatService.parseResponse(this.message.content);
        if (this.parsedResponse) {
          this.updateDisplayed();
        }
      }
    }
  }
  updateDisplayed() {
    if (this.parsedResponse?.outfits) {
      this.displayedOutfits.set(this.parsedResponse.outfits.slice(0, this.visibleCount()));
    }
  }

  onProfileFormSubmit(formData: any) {
    console.log('Profile form submitted:', formData);
    
    // Emit the form data with session ID
    this.formSubmit.emit({
      sessionId: this.sessionId,
      formData: formData,
    });
  }
  onProfileFormSkip() {
    console.log('Profile form skipped');
    
    // Emit skip event with session ID
    this.formSubmit.emit({
      sessionId: this.sessionId,
      action: 'skip',
    });
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