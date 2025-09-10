export class RateLimiter {
  private lastRequestTime = 0;
  private readonly minRequestInterval: number;

  constructor(requestInterval: number = 1000) {
    this.minRequestInterval = requestInterval;
  }

  async enforce(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }
}
