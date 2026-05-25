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

export type BudgetRange =
  | 'Under $100'
  | '$100 - $200'
  | '$200 - $500'
  | '$500 - $1000'
  | '$1000+';

export type SubscriptionPlan = 'Free' | 'Pro' | 'Elite';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  stylePreference: StylePreference;
  budgetRange: BudgetRange;
  plan: SubscriptionPlan;
  gender?: 'male' | 'female' | 'unisex';
  savedOutfits: string[];
  totalLikes: number;
  totalOrders: number;
  createdAt: Date;
}

export const DEFAULT_PROFILE: UserProfile = {
  id: 'guest-001',
  name: 'Fashion Enthusiast',
  email: 'user@way2wear.app',
  stylePreference: 'Minimalist / Modern',
  budgetRange: '$200 - $500',
  plan: 'Free',
  savedOutfits: [],
  totalLikes: 12,
  totalOrders: 4,
  createdAt: new Date(),
};
