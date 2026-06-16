import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Message, OutfitResponse, Outfit } from '../../../core/models/message.model';
import { OutfitCardComponent } from '../outfit-card/outfit-card.component';
import { ChatService } from '../../../core/services/chat.service';

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

  parsedResponse: OutfitResponse | null = null;
  isUser = false;

  constructor(private chatService: ChatService) {}

  ngOnInit() {
    this.isUser = this.message.role === 'user';
    if (!this.isUser) {
      this.parsedResponse = this.chatService.parseResponse(this.message.content);
    }
  }
}