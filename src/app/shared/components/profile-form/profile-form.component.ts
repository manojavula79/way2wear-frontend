import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DynamicFormField, SubmittedFormValues } from '../../../core/models/message.model';

@Component({
  selector: 'app-profile-form',
  templateUrl: './profile-form.component.html',
  styleUrls: ['./profile-form.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class ProfileFormComponent {
  @Input() message: string = '';
  @Input() formFields: Record<string, DynamicFormField> = {};

  /**
   * Owned by the parent. The form never keeps its own permanent loading flag,
   * so a failed or completed request can always enable the button again.
   */
  @Input() submitting = false;

  @Output() formSubmit = new EventEmitter<SubmittedFormValues>();
  @Output() formSkip = new EventEmitter<void>();

  // Form state
  selectedGender: string | null = null;
  selectedSkinTone: string | null = null;
  selectedSize: string | null = null;
  validationError = '';

  /**
   * User clicks a gender button
   */
  selectGender(gender: string) {
    if (this.submitting) return;
    this.selectedGender = gender.toLowerCase();
    this.validationError = '';
  }
  selectSkinTone(tone: string) {
    if (this.submitting) return;
    this.selectedSkinTone = tone.toLowerCase();
  }

  /**
   * User selects size from dropdown
   */
  selectSize(size: string) {
    if (this.submitting) return;
    this.selectedSize = size ? size.toLowerCase() : null;
  }

  /**
   * User clicks Submit button
   * Validates required fields and emits data
   */
  submitForm() {
    if (this.submitting) return;

    const missing = this.getMissingRequiredFields();
    if (missing.length > 0) {
      this.validationError = `Please select ${missing.map(f => this.fieldLabel(f)).join(', ')}.`;
      return;
    }

    this.validationError = '';
    this.formSubmit.emit({
      gender: this.selectedGender,
      skin_tone: this.selectedSkinTone || null,
      size: this.selectedSize || null,
    });
  }

  /**
   * User clicks Skip button
   * Continues without filling form
   */
  skipForm() {
    if (this.submitting) return;
    this.formSkip.emit();
  }

  /**
   * Check if field is required
   */
  isRequired(fieldName: string): boolean {
    return this.formFields[fieldName]?.required === true;
  }

  /**
   * Get button options for a field
   */
  getOptions(fieldName: string): string[] {
    return this.formFields[fieldName]?.options || [];
  }

  getToneColor(tone: string): string {
    const toneColors: { [key: string]: string } = {
      'fair': '#f4d4c8',      // Light peach
      'Fair': '#f4d4c8',
      'medium': '#d4a574',    // Medium brown
      'Medium': '#d4a574',
      'dark': '#8b6f47',      // Dark brown
      'Dark': '#8b6f47',
    };

    return toneColors[tone] || '#ddd';
  }

  private getMissingRequiredFields(): string[] {
    // Only fields rendered by this component can be validated here.
    const supportedFields = ['gender', 'skin_tone', 'size'];
    const currentValues: Record<string, string | null> = {
      gender: this.selectedGender,
      skin_tone: this.selectedSkinTone,
      size: this.selectedSize,
    };

    return supportedFields.filter(
      field => this.formFields[field] && this.isRequired(field) && !currentValues[field],
    );
  }

  private fieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      gender: 'a gender',
      skin_tone: 'a skin tone',
      size: 'a size',
    };
    return labels[fieldName] || fieldName.replace(/_/g, ' ');
  }
}
