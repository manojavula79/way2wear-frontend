import { Component, Input, OnInit, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Message,
  OutfitResponse,
  Outfit,
  DynamicFormResponse,
  ProfileFormSubmission,
  SubmittedFormValues,
} from '../../../core/models/message.model';
import { OutfitCardComponent } from '../outfit-card/outfit-card.component';
import { ChatService } from '../../../core/services/chat.service';
import { ProfileFormComponent } from '../profile-form/profile-form.component';
import { OutfitDetailModalComponent } from '../outfit-detail-modal/outfit-detail-modal.component';
import { Router } from '@angular/router';
const INITIAL_COUNT = 3;
const INCREMENT = 3;
const MAX_COUNT = 12;

@Component({
  selector: 'app-message-bubble',
  templateUrl: './message-bubble.component.html',
  styleUrls: ['./message-bubble.component.scss'],
  standalone: true,
  imports: [CommonModule, OutfitCardComponent, ProfileFormComponent, OutfitDetailModalComponent],
})
export class MessageBubbleComponent implements OnInit {
  @Input({ required: true }) message!: Message;
  @Input() sessionId: string = '';
  /** Parent-owned request state so the form can never get stuck loading. */
  @Input() submitting = false;
  @Output() viewDetails = new EventEmitter<Outfit>();
  @Output() formSubmit = new EventEmitter<ProfileFormSubmission>();

  parsedResponse: OutfitResponse | null = null;
  errorText = '';
  isUser = false;
  isProfileForm = false;
  profileFormData: DynamicFormResponse | null = null;
  displayedOutfits = signal<Outfit[]>([]);

  // Tracks how many outfits are currently visible: 3, 6, 9, 12
  visibleCount = signal(INITIAL_COUNT);
  selectedOutfit: any = null;
  showDetailModal = false;

  constructor(
    private chatService: ChatService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.isUser = this.message.role === 'user';

    if (!this.isUser) {
      this.hydrateAssistantMessage();
    }
  }

  private hydrateAssistantMessage(): void {
    if (this.message.error) {
      this.errorText = this.extractErrorMessage(this.message.content);
      return;
    }

    const content = this.chatService.parseAssistantContent(this.message.content);

    if (content.kind === 'form') {
      this.isProfileForm = true;
      this.profileFormData = content.form;
      return;
    }

    this.parsedResponse = content.kind === 'outfits'
      ? content.response
      : { message: content.text, tip: null, outfits: [] };
    this.updateDisplayed();
  }

  private extractErrorMessage(raw: string): string {
    const content = this.chatService.parseAssistantContent(raw);
    if (content.kind === 'outfits' && content.response.message) {
      return content.response.message;
    }
    if (content.kind === 'form' && content.form.message) {
      return content.form.message;
    }
    if (content.kind === 'text' && content.text) {
      return content.text;
    }
    return "I'm having trouble right now. Please try again in a moment.";
  }

  updateDisplayed() {
    if (this.parsedResponse?.outfits) {
      this.displayedOutfits.set(this.parsedResponse.outfits.slice(0, this.visibleCount()));
    }
  }

  onProfileFormSubmit(formData: SubmittedFormValues) {
    if (this.submitting) return;
    this.formSubmit.emit({
      sessionId: this.sessionId,
      messageId: this.message.id,
      formType: this.profileFormData?.form_type,
      formData,
    });
  }

  onProfileFormSkip() {
    if (this.submitting) return;
    this.formSubmit.emit({
      sessionId: this.sessionId,
      messageId: this.message.id,
      formType: this.profileFormData?.form_type,
      action: 'skip',
    });
  }

  totalOutfitCount(): number {
    return Math.min(this.parsedResponse?.outfits.length ?? 0, MAX_COUNT);
  }

  nextBatchCount(): number {
    const next = Math.min(
      this.visibleCount() + INCREMENT,
      this.totalOutfitCount(),
    );
    return Math.max(0, next - this.visibleCount());
  }

  loadMore(): void {
    const next = Math.min(
      this.visibleCount() + INCREMENT,
      this.totalOutfitCount(),
    );

    if (next <= this.visibleCount()) return;

    this.visibleCount.set(next);
    // visibleCount changed, so the slice powering the template must be
    // refreshed explicitly for the new cards to render.
    this.updateDisplayed();
  }

  hasMore(): boolean {
    return this.visibleCount() < this.totalOutfitCount();
  }

  trackByOutfit(_: number, outfit: Outfit): string {
    return outfit.id;
  }

  onOutfitViewDetails(outfit: any) {
    this.selectedOutfit = outfit;
    this.showDetailModal = true;
  }
  onCloseDetailModal() {
    this.showDetailModal = false;
    this.selectedOutfit = null;
  }
  onPreviewImage(outfit:any){
    this.router.navigate(['/outfit-preview'], {
      state: { outfit: outfit}
    });
    this.showDetailModal = false;
  }
}
