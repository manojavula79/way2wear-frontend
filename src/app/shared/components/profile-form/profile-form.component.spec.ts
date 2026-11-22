import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileFormComponent } from './profile-form.component';
import { DynamicFormField } from '../../../core/models/message.model';

describe('ProfileFormComponent', () => {
  let fixture: ComponentFixture<ProfileFormComponent>;
  let component: ProfileFormComponent;

  const formFields: Record<string, DynamicFormField> = {
    gender: { type: 'buttons', options: ['Male', 'Female', 'Unisex'], required: true },
    skin_tone: { type: 'buttons', options: ['Fair', 'Medium', 'Dark'], required: false },
    size: { type: 'dropdown', options: ['XS', 'S', 'M', 'L'], required: false },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('message', 'Tell me about your brother.');
    fixture.componentRef.setInput('formFields', formFields);
    fixture.detectChanges();
  });

  it('blocks submission and never enters a loading state when required fields are missing', () => {
    const emitSpy = spyOn(component.formSubmit, 'emit');

    component.submitForm();

    expect(emitSpy).not.toHaveBeenCalled();
    expect(component.validationError).toContain('gender');
    expect(component.submitting).toBeFalse();
    expect(fixture.nativeElement.textContent).not.toContain('Loading...');
  });

  it('emits normalized values for a valid submission', () => {
    const emitSpy = spyOn(component.formSubmit, 'emit');

    component.selectGender('Male');
    component.selectSkinTone('Fair');
    component.selectSize('M');
    component.submitForm();

    expect(emitSpy).toHaveBeenCalledOnceWith({
      gender: 'male',
      skin_tone: 'fair',
      size: 'm',
    });
    expect(component.validationError).toBe('');
    expect(component.submitting).toBeFalse();
  });

  it('uses the parent-owned submitting state and ignores duplicate submits', () => {
    const emitSpy = spyOn(component.formSubmit, 'emit');

    fixture.componentRef.setInput('submitting', true);
    fixture.detectChanges();

    component.selectGender('Male');
    component.submitForm();

    expect(emitSpy).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Loading...');

    // When the parent finishes (success or failure), the button is enabled again.
    fixture.componentRef.setInput('submitting', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Continue');
  });
});
