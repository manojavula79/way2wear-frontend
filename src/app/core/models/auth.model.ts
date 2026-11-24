// ============================================
// AUTH CONTRACTS — username / password
// ============================================

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface SignupRequest {
  username: string;
  password: string;
  full_name: string;
  gender?: string;
  age?: number;
  height_cm?: number;
  skin_tone?: string;
  style_preference?: string;
  fit_type?: string;
  budget_range?: string;
}

export interface UsernameAvailabilityResponse {
  available: boolean;
}

export const AUTH_MESSAGES = {
  usernameTaken: 'Username already taken. Please choose another username.',
  invalidCredentials: 'Invalid username or password.',
  invalidUsername: 'Username must be 3-30 letters, numbers or underscores.',
  network: 'Network error. Please check your connection and try again.',
  generic: 'Something went wrong. Please try again.',
} as const;

/** Auth error with a message that is safe to display to the user. */
export class AuthError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'AuthError';
  }
}
