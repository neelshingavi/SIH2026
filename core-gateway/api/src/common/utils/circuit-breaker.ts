import { Logger } from '@nestjs/common';

export enum CircuitState {
  CLOSED,
  OPEN,
  HALF_OPEN
}

export class CircuitBreaker {
  private state = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime: number | null = null;
  private readonly logger = new Logger(CircuitBreaker.name);

  constructor(
    private readonly failureThreshold = 5,
    private readonly resetTimeoutMs = 30000 // 30s
  ) {}

  async fire<T>(action: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.lastFailureTime && Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        this.logger.warn('Circuit entering HALF_OPEN state. Testing upstream...');
        this.state = CircuitState.HALF_OPEN;
      } else {
        throw new Error('CircuitBreaker OPEN: Upstream service is failing.');
      }
    }

    try {
      const result = await action();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    if (this.state === CircuitState.HALF_OPEN) {
      this.logger.log('Circuit recovered. Entering CLOSED state.');
      this.state = CircuitState.CLOSED;
    }
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.failureThreshold && this.state !== CircuitState.OPEN) {
      this.logger.error(`Circuit threshold (\${this.failureThreshold}) reached. Entering OPEN state.`);
      this.state = CircuitState.OPEN;
    }
  }
}
