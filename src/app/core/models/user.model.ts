// ============================================
// USER / PROFILE MODEL
// ============================================

export type StylePreference =
  | 'Minimalist / Modern'
  | 'Classic / Timeless'
  | 'Streetwear / Urban'
  | 'Bohemian / Free-spirit'
  | 'Formal / Business'
  | 'Athleisure / Active';

export type FitType = 'Slim' | 'Regular' | 'Relaxed' | 'Baggy' | 'Oversized';

export type SkinTone = 'Fair' | 'Light' | 'Medium' | 'Olive' | 'Brown' | 'Dark';

export type BudgetRange =
  | 'Under ₹1000'
  | '₹1000 - ₹2000'
  | '₹2000 - ₹5000'
  | '₹5000 - ₹10000'
  | '₹10000+';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;

  // Style preferences
  stylePreference: StylePreference;
  fitType: FitType;
  budgetRange: BudgetRange;
  gender?: 'male' | 'female' | 'unisex';

  // Physical attributes (for better recommendations)
  heightCm?: number;
  skinTone?: SkinTone;
  favoriteColors?: string[];

  // Stats
  savedOutfits: string[];
  totalLikes: number;

  createdAt: Date;
}

export const DEFAULT_PROFILE: UserProfile = {
  id: 'guest-001',
  name: 'Fashion Enthusiast',
  email: '',
  stylePreference: 'Minimalist / Modern',
  fitType: 'Regular',
  budgetRange: '₹2000 - ₹5000',
  gender: 'unisex',
  heightCm: undefined,
  skinTone: undefined,
  favoriteColors: [],
  savedOutfits: [],
  totalLikes: 12,
  createdAt: new Date(),
};

// Options for dropdowns in Account Settings
export const STYLE_OPTIONS: StylePreference[] = [
  'Minimalist / Modern',
  'Classic / Timeless',
  'Streetwear / Urban',
  'Bohemian / Free-spirit',
  'Formal / Business',
  'Athleisure / Active',
];

export const FIT_OPTIONS: FitType[] = [
  'Slim', 'Regular', 'Relaxed', 'Baggy', 'Oversized',
];

export const SKIN_TONE_OPTIONS: SkinTone[] = [
  'Fair', 'Light', 'Medium', 'Olive', 'Brown', 'Dark',
];

export const BUDGET_OPTIONS: BudgetRange[] = [
  'Under ₹1000',
  '₹1000 - ₹2000',
  '₹2000 - ₹5000',
  '₹5000 - ₹10000',
  '₹10000+',
];
