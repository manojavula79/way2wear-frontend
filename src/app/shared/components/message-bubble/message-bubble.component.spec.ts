import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { MessageBubbleComponent } from './message-bubble.component';
import { ProfileFormComponent } from '../profile-form/profile-form.component';
import { Message, ProfileFormSubmission } from '../../../core/models/message.model';

describe('MessageBubbleComponent', () => {
  let fixture: ComponentFixture<MessageBubbleComponent>;
  let component: MessageBubbleComponent;

  const formContent = JSON.stringify({
    needs_form: true,
    form_type: 'other',
    message: 'To style your brother, tell me his gender and skin tone.',
    form_fields: {
      gender: { type: 'buttons', options: ['Male', 'Female', 'Unisex'], required: true },
      skin_tone: { type: 'buttons', options: ['Fair', 'Medium', 'Dark'], required: false },
      size: { type: 'dropdown', options: ['S', 'M', 'L'], required: false },
    },
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MessageBubbleComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
      ],
    }).compileComponents();
  });

  function render(content: string, options: Partial<Message> = {}): void {
    fixture = TestBed.createComponent(MessageBubbleComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('message', {
      id: 'form-message-1',
      role: 'assistant',
      content,
      timestamp: new Date(),
      ...options,
    });
    fixture.componentRef.setInput('sessionId', 'session-1');
    fixture.detectChanges();
  }

  it('renders the dynamic form without rendering its raw JSON', () => {
    render(formContent);

    expect(fixture.nativeElement.querySelector('app-profile-form')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('To style your brother');
    expect(fixture.nativeElement.textContent).not.toContain('needs_form');
    expect(fixture.nativeElement.textContent).not.toContain('form_fields');
  });

  it('emits the form values together with the form message and session IDs', () => {
    render(formContent);
    const formDebug = fixture.debugElement.query(By.directive(ProfileFormComponent));
    const form = formDebug.componentInstance as ProfileFormComponent;

    let event: ProfileFormSubmission | undefined;
    component.formSubmit.subscribe(value => event = value);

    form.formSubmit.emit({ gender: 'male', skin_tone: 'fair', size: 'm' });

    expect(event).toEqual({
      sessionId: 'session-1',
      messageId: 'form-message-1',
      formType: 'other',
      formData: { gender: 'male', skin_tone: 'fair', size: 'm' },
    });
  });

  it('renders a normal outfit response as text', () => {
    render(JSON.stringify({ message: 'Here are three looks.', tip: null, outfits: [] }));

    expect(fixture.nativeElement.textContent).toContain('Here are three looks.');
    expect(fixture.nativeElement.textContent).not.toContain('"outfits"');
  });

  it('renders malformed/plain text safely', () => {
    render('Let me style you. Tell me the occasion.');

    expect(fixture.nativeElement.textContent).toContain('Let me style you.');
  });

  it('shows only the human-readable error message, not raw JSON', () => {
    render(JSON.stringify({ message: 'Rate limit exceeded.', outfits: [] }), { error: true });

    const errorBox = fixture.nativeElement.querySelector('.error-msg') as HTMLElement;
    expect(errorBox.textContent).toContain('Rate limit exceeded.');
    expect(errorBox.textContent).not.toContain('{');
  });

  function outfit(index: number) {
    return {
      id: `outfit-${index}`,
      name: `Look ${index}`,
      top: { title: `Top ${index}`, price: 1000 },
      bottom: { title: `Bottom ${index}`, price: 1200 },
    };
  }

  function renderOutfits(count: number): void {
    render(JSON.stringify({
      message: 'Here are some looks.',
      tip: null,
      outfits: Array.from({ length: count }, (_, index) => outfit(index + 1)),
    }));
  }

  function renderedCards(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('app-outfit-card'));
  }

  function loadMoreButton(): HTMLButtonElement | null {
    return fixture.nativeElement.querySelector('.load-more-btn') as HTMLButtonElement | null;
  }

  it('initially shows three outfits and reveals three more on each click', () => {
    renderOutfits(8);

    expect(renderedCards().length).toBe(3);
    expect(loadMoreButton()?.textContent).toContain('Load 3 more outfits');
    expect(fixture.nativeElement.querySelector('.outfit-count')?.textContent)
      .toContain('Showing 3 of 8 outfits');

    loadMoreButton()!.click();
    fixture.detectChanges();

    expect(renderedCards().length).toBe(6);
    expect(loadMoreButton()?.textContent).toContain('Load 2 more outfits');
    expect(fixture.nativeElement.querySelector('.outfit-count')?.textContent)
      .toContain('Showing 6 of 8 outfits');

    loadMoreButton()!.click();
    fixture.detectChanges();

    expect(renderedCards().length).toBe(8);
    expect(loadMoreButton()).toBeNull();
  });

  it('never reveals more than twelve outfits', () => {
    renderOutfits(20);

    for (let click = 0; click < 3; click++) {
      loadMoreButton()!.click();
      fixture.detectChanges();
    }

    expect(renderedCards().length).toBe(12);
    expect(loadMoreButton()).toBeNull();
  });

  it('does not render the load-more section when three or fewer outfits exist', () => {
    renderOutfits(3);

    expect(renderedCards().length).toBe(3);
    expect(loadMoreButton()).toBeNull();
  });
});
