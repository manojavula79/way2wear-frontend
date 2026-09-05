import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profile-form',
  templateUrl: './profile-form.component.html',
  styleUrls: ['./profile-form.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class ProfileFormComponent {
  @Input() message: string = '';
  @Input() formFields: any = {};
  @Output() formSubmit = new EventEmitter<any>();
  @Output() formSkip = new EventEmitter<void>();

  // Form state
  selectedGender: string | null = null;
  selectedSkinTone: string | null = null;
  selectedSize: string | null = null;
  isSubmitting = false;

  /**
   * User clicks a gender button
   */
  selectGender(gender: string) {
    this.selectedGender = gender.toLowerCase();
  }
  selectSkinTone(tone: string) {
    this.selectedSkinTone = tone.toLowerCase();
  }

  /**
   * User selects size from dropdown
   */
  selectSize(size: string) {
    this.selectedSize = size.toLowerCase();
  }

  /**
   * User clicks Submit button
   * Validates required fields and emits data
   */
  submitForm() {
    // Validate required fields
    if (!this.selectedGender) {
      alert('Please select a gender');
      return;
    }

    this.isSubmitting = true;

    const formData = {
      gender: this.selectedGender,
      skin_tone: this.selectedSkinTone || null,  // Optional
      size: this.selectedSize || null,           // Optional
    };

    this.formSubmit.emit(formData);
  }

  /**
   * User clicks Skip button
   * Continues without filling form
   */
  skipForm() {
    this.isSubmitting = true;
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
}
