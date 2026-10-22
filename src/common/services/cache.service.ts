import { Injectable, Logger } from '@nestjs/common';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

@Injectable()
export class MemoryCacheService {
  private readonly logger = new Logger(MemoryCacheService.name);
  private readonly cache = new Map<string, CacheEntry<any>>();
  private readonly inflightPromises = new Map<string, Promise<any>>();

  /**
   * Get a cached value by key if not expired.
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.data as T;
  }

  /**
   * Set a cached value with TTL in seconds.
   */
  set<T>(key: string, data: T, ttlSeconds = 60): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { data, expiresAt });
  }

  /**
   * Get or set with automatic fetcher execution and stampede protection.
   * If multiple concurrent calls request the same key simultaneously,
   * they share the exact same in-flight Promise.
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds = 60,
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    // Check if an in-flight Promise is already running for this key
    const existingInflight = this.inflightPromises.get(key);
    if (existingInflight) {
      return existingInflight as Promise<T>;
    }

    const promise = (async () => {
      try {
        const result = await fetcher();
        this.set(key, result, ttlSeconds);
        return result;
      } finally {
        this.inflightPromises.delete(key);
      }
    })();

    this.inflightPromises.set(key, promise);
    return promise;
  }

  /**
   * Invalidate a single key.
   */
  delete(key: string): void {
    this.cache.delete(key);
    this.inflightPromises.delete(key);
  }

  /**
   * Invalidate all keys matching a string prefix or RegExp pattern.
   */
  invalidatePattern(pattern: string | RegExp): void {
    let count = 0;
    const isString = typeof pattern === 'string';

    for (const key of this.cache.keys()) {
      const match = isString ? key.startsWith(pattern) : pattern.test(key);
      if (match) {
        this.cache.delete(key);
        count++;
      }
    }

    for (const key of this.inflightPromises.keys()) {
      const match = isString ? key.startsWith(pattern) : pattern.test(key);
      if (match) {
        this.inflightPromises.delete(key);
      }
    }

    if (count > 0) {
      this.logger.debug(`Invalidated ${count} cache entries for pattern: ${pattern}`);
    }
  }

  /**
   * Clear entire cache.
   */
  clear(): void {
    this.cache.clear();
    this.inflightPromises.clear();
  }
}
