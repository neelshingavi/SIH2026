import { Injectable, NestMiddleware, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

// Simple in-memory rate limiter for Phase 45
// In production with multiple instances, this should be Redis-backed.
@Injectable()
export class RateLimiterMiddleware implements NestMiddleware {
  private readonly store = new Map<string, { count: number; expiresAt: number }>();
  
  // Defaults: 100 requests per 1 minute
  private readonly WINDOW_MS = 60000;
  private readonly MAX_REQUESTS = 100;

  use(req: Request, res: Response, next: NextFunction) {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const route = req.baseUrl;
    const key = `\${ip}:\${route}`;
    const now = Date.now();

    const record = this.store.get(key);

    if (!record || record.expiresAt < now) {
      this.store.set(key, { count: 1, expiresAt: now + this.WINDOW_MS });
    } else {
      record.count++;
      if (record.count > this.MAX_REQUESTS) {
        return res.status(HttpStatus.TOO_MANY_REQUESTS).json({
          errorCode: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later.',
          retryable: true,
          retryAfterMs: record.expiresAt - now
        });
      }
    }
    
    // Optional cleanup of expired keys to prevent memory leak
    if (Math.random() < 0.01) {
      for (const [k, v] of this.store.entries()) {
        if (v.expiresAt < now) this.store.delete(k);
      }
    }

    next();
  }
}
