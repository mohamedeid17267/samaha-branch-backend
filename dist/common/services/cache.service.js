"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var MemoryCacheService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryCacheService = void 0;
const common_1 = require("@nestjs/common");
let MemoryCacheService = MemoryCacheService_1 = class MemoryCacheService {
    logger = new common_1.Logger(MemoryCacheService_1.name);
    cache = new Map();
    inflightPromises = new Map();
    get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return undefined;
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return undefined;
        }
        return entry.data;
    }
    set(key, data, ttlSeconds = 60) {
        const expiresAt = Date.now() + ttlSeconds * 1000;
        this.cache.set(key, { data, expiresAt });
    }
    async getOrSet(key, fetcher, ttlSeconds = 60) {
        const cached = this.get(key);
        if (cached !== undefined) {
            return cached;
        }
        const existingInflight = this.inflightPromises.get(key);
        if (existingInflight) {
            return existingInflight;
        }
        const promise = (async () => {
            try {
                const result = await fetcher();
                this.set(key, result, ttlSeconds);
                return result;
            }
            finally {
                this.inflightPromises.delete(key);
            }
        })();
        this.inflightPromises.set(key, promise);
        return promise;
    }
    delete(key) {
        this.cache.delete(key);
        this.inflightPromises.delete(key);
    }
    invalidatePattern(pattern) {
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
    clear() {
        this.cache.clear();
        this.inflightPromises.clear();
    }
};
exports.MemoryCacheService = MemoryCacheService;
exports.MemoryCacheService = MemoryCacheService = MemoryCacheService_1 = __decorate([
    (0, common_1.Injectable)()
], MemoryCacheService);
//# sourceMappingURL=cache.service.js.map