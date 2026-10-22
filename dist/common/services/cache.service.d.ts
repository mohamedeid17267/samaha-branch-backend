export declare class MemoryCacheService {
    private readonly logger;
    private readonly cache;
    private readonly inflightPromises;
    get<T>(key: string): T | undefined;
    set<T>(key: string, data: T, ttlSeconds?: number): void;
    getOrSet<T>(key: string, fetcher: () => Promise<T>, ttlSeconds?: number): Promise<T>;
    delete(key: string): void;
    invalidatePattern(pattern: string | RegExp): void;
    clear(): void;
}
