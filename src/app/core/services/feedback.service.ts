import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface FeedbackPayload {
  rating: number;       // 1-5
  message: string;
}

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private http = inject(HttpClient);

  async submitFeedback(payload: FeedbackPayload): Promise<void> {
    await firstValueFrom(
      this.http.post(
        `${environment.apiUrl}/feedback`,
        { rating: payload.rating, message: payload.message }
      ).pipe(timeout(15000))
    );
  }
}
