"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var WebsiteSyncService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebsiteSyncService = void 0;
const common_1 = require("@nestjs/common");
let WebsiteSyncService = WebsiteSyncService_1 = class WebsiteSyncService {
    logger = new common_1.Logger(WebsiteSyncService_1.name);
    async syncStock(sku, newStock, extra) {
        if (!sku)
            return;
        const isVercel = Boolean(process.env.VERCEL) || Boolean(process.env.VERCEL_ENV);
        const rawUrl = process.env.LINEA_WEBSITE_URL;
        if (isVercel && (!rawUrl || rawUrl.includes('localhost') || rawUrl.includes('127.0.0.1'))) {
            return;
        }
        const effectiveUrl = rawUrl || 'http://127.0.0.1:3005';
        const secret = process.env.LINEA_SYNC_SECRET || 'samaha-linea-sync-key-2026';
        const urlsToTry = [effectiveUrl];
        if (effectiveUrl.includes('localhost')) {
            urlsToTry.push(effectiveUrl.replace('localhost', '127.0.0.1'));
        }
        else if (effectiveUrl.includes('127.0.0.1')) {
            urlsToTry.push(effectiveUrl.replace('127.0.0.1', 'localhost'));
        }
        const payload = {
            sku: sku.trim(),
            stock: Math.max(0, Number(newStock ?? 0)),
            price: extra?.price !== undefined && !isNaN(Number(extra.price)) ? Number(extra.price) : undefined,
            wholesalePrice: extra?.wholesalePrice !== undefined && !isNaN(Number(extra.wholesalePrice)) ? Number(extra.wholesalePrice) : undefined,
        };
        let synced = false;
        let lastError = null;
        for (let attempt = 1; attempt <= 2 && !synced; attempt++) {
            for (const targetBase of urlsToTry) {
                try {
                    const response = await fetch(`${targetBase}/api/webhooks/stock-sync`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-sync-secret': secret,
                        },
                        body: JSON.stringify(payload),
                        signal: AbortSignal.timeout(2500),
                    });
                    if (response.ok) {
                        const data = (await response.json().catch(() => null));
                        if (data?.found) {
                            this.logger.log(`[Website Sync] SKU [${sku}] successfully synced to Linea! Stock: ${data.newStock} (${data.status})`);
                        }
                        else {
                            this.logger.log(`[Website Sync] Webhook responded: SKU [${sku}] not currently published on website`);
                        }
                        synced = true;
                        break;
                    }
                    else {
                        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                }
                catch (err) {
                    lastError = err;
                }
            }
            if (!synced && attempt === 1) {
                await new Promise((resolve) => setTimeout(resolve, 500));
            }
        }
        if (!synced && lastError) {
            this.logger.warn(`[Website Sync] Could not sync SKU [${sku}] to Linea website after retries: ${lastError.message}`);
        }
    }
    async syncMultiple(items) {
        if (!items || items.length === 0)
            return;
        for (const item of items) {
            await this.syncStock(item.sku, item.stock);
        }
    }
};
exports.WebsiteSyncService = WebsiteSyncService;
exports.WebsiteSyncService = WebsiteSyncService = WebsiteSyncService_1 = __decorate([
    (0, common_1.Injectable)()
], WebsiteSyncService);
//# sourceMappingURL=website-sync.service.js.map