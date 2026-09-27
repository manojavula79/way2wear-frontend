/**
 * - Added productTopImage and productBottomImage parameters
 * - Send base64 images to backend for DALL-E
 * - Include product colors in prompt
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment'

// ===== INTERFACES =====

export interface ParsedRefinement {
  type: string;
  value: string;
  confidence: number;
  preserves_clothing: boolean;
}

export interface RefinementParseResult {
  success: boolean;
  instruction: string;
  refinements: ParsedRefinement[];
  preserves_clothing: boolean;
  warnings: string[];
  summary: string;
  combined_prompt: string;
}

export interface GenerateOutfitRequest {
  outfit_description: string;
  style_hint?: string;
  user_context?: string;
  use_cache?: boolean;
  // TASK 2/5: Product images
  product_top_image?: string;
  product_bottom_image?: string;
  product_top_color?: string;
  product_bottom_color?: string;
  // TASK 3: User context
  user_profile_image?: string;
  user_skin_tone?: string;
  user_color_preference?: string[];
  user_height?: string;
  user_occasion?: string;
}

export interface GenerateOutfitRequestV4 {
  outfit_description: string;
  style_hint?: string;
  user_context?: string;
  // TASK 5: Multi-image references
  person_image?: string;
  product_top_image?: string;
  product_bottom_image?: string;
  // TASK 3: User personalization
  user_skin_tone?: string;
  user_color_preference?: string[];
  user_height?: string;
  user_occasion?: string;
  // TASK 6: Refinement
  refinement_instructions?: string;
  use_cache?: boolean;
}

export interface RegenerateOutfitRequestV4 {
  outfit_description: string;
  // TASK 6: Refinement
  refinement_instructions?: string;
  user_context?: string;
  style_hint?: string;
  // TASK 5: Multi-image
  person_image?: string;
  product_top_image?: string;
  product_bottom_image?: string;
  // TASK 3: User context
  user_skin_tone?: string;
  user_color_preference?: string[];
  user_height?: string;
  user_occasion?: string;
}

export interface OutfitResponse {
  success: boolean;
  image_url?: string;
  prompt_used?: string;
  cached?: boolean;
  refined?: boolean;
  image_references_used?: number;
  // TASK 6: Refinement info
  refinements_parsed?: {
    count: number;
    types: string[];
    preserves_clothing?: boolean;
  };
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class OutfitService {
  private apiUrl = `${environment.apiUrl}/outfits`;

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  constructor(private http: HttpClient) {}
  generateOutfitImage(
    request:any
  ): Observable<OutfitResponse> {
    const payload = {
      outfit_description: request.outfit_description,
      style_hint: request.style_hint || 'professional fashion photography',
      user_context: request.user_context || '',
      use_cache: request.use_cache !== false,
      // TASK 5: Multi-image
      person_image: request.person_image || null,
      product_top_image: request.product_top_image || null,
      product_bottom_image: request.product_bottom_image || null,
      // TASK 3: User context
      user_skin_tone: request.user_skin_tone || null,
      user_color_preference: request.user_color_preference || [],
      user_height: request.user_height || null,
      user_occasion: request.user_occasion || null,
      // TASK 6: Refinement
      refinement_instructions: request.refinement_instructions || '',
    };

    return this.http.post<OutfitResponse>(
      `${this.apiUrl}/v4/generate`,
      payload,
      this.httpOptions
    );
  }

  /**
   * Regenerate with TASK 6 refinement parsing
   */
  regenerateOutfitImage(
    request:any
  ): Observable<OutfitResponse> {
    const payload = {
      outfit_description: request.outfit_description,
      refinement_instructions: request.refinement_instructions || '',
      user_context: request.user_context || '',
      style_hint: request.style_hint || 'professional fashion photography',
      // TASK 5: Multi-image
      person_image: request.person_image || null,
      product_top_image: request.product_top_image || null,
      product_bottom_image: request.product_bottom_image || null,
      // TASK 3: User context
      user_skin_tone: request.user_skin_tone || null,
      user_color_preference: request.user_color_preference || [],
      user_height: request.user_height || null,
      user_occasion: request.user_occasion || null,
    };

    return this.http.post<OutfitResponse>(
      `${this.apiUrl}/v4/generate`,
      payload,
      this.httpOptions
    );
  }

  // ===== TASK 6: Refinement Methods =====

  /**
   * Parse refinement without generating image
   * 
   * Use to test what will be changed before generating
   */
  parseRefinement(refinement_instructions: string): Observable<RefinementParseResult> {
    return this.http.post<RefinementParseResult>(
      `${this.apiUrl}/parse-refinement`,
      { refinement_instructions },
      this.httpOptions
    );
  }

  /**
   * Get refinement examples
   */
  getRefinementExamples(): Observable<any> {
    return this.http.get(`${this.apiUrl}/v4/refinement-examples`);
  }

  // ===== TASK 5: Model Info =====

  /**
   * Get current model information
   */
  getModelInfo(): Observable<any> {
    return this.http.get(`${this.apiUrl}/model-info`);
  }

  // ===== UTILITY METHODS =====

  /**
   * Get generation history
   */
  getGenerationHistory(limit: number = 20): Observable<any> {
    return this.http.get(`${this.apiUrl}/history?limit=${limit}`);
  }

  /**
   * Check rate limit
   */
  checkRateLimit(): Observable<any> {
    return this.http.get(`${this.apiUrl}/rate-limit`);
  }
}
