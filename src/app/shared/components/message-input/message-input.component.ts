import { Component, Output, EventEmitter, signal, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-message-input',
  templateUrl: './message-input.component.html',
  styleUrls: ['./message-input.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class MessageInputComponent {
  @Output() messageSent = new EventEmitter<string>();
  @ViewChild('inputEl') inputEl!: ElementRef<HTMLInputElement>;

  inputText = signal('');
  isListening = signal(false);

  get hasText(): boolean {
    return this.inputText().trim().length > 0;
  }

  onInput(event: Event) {
    this.inputText.set((event.target as HTMLInputElement).value);
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  send() {
    const text = this.inputText().trim();
    if (!text) return;
    this.messageSent.emit(text);
    this.inputText.set('');
    if (this.inputEl) this.inputEl.nativeElement.value = '';
  }

  setPrompt(text: string) {
    this.inputText.set(text);
    setTimeout(() => {
      this.inputEl?.nativeElement.focus();
    }, 100);
  }
}
