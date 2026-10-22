export declare class WebsiteSyncService {
    private readonly logger;
    syncStock(sku: string, newStock: number, extra?: {
        price?: number;
        wholesalePrice?: number;
    }): Promise<void>;
    syncMultiple(items: {
        sku: string;
        stock: number;
    }[]): Promise<void>;
}
