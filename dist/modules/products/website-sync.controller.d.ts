import { ProductsService } from './products.service';
export declare class WebsiteSyncController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    lookup(code: string, branchId?: string, secret?: string): Promise<{
        found: boolean;
        message: string;
        productId?: undefined;
        name?: undefined;
        sku?: undefined;
        supplierCode?: undefined;
        stock?: undefined;
        websitePrice?: undefined;
        wholesalePrice?: undefined;
        retailPrice?: undefined;
    } | {
        found: boolean;
        productId: number;
        name: string;
        sku: string;
        supplierCode: string;
        stock: number;
        websitePrice: number;
        wholesalePrice: number;
        retailPrice: number;
        message?: undefined;
    }>;
    catalog(branchId?: string, secret?: string): Promise<{
        id: number;
        name: string;
        sku: string;
        supplierCode: string;
        stock: number;
        websitePrice: number;
        wholesalePrice: number;
        retailPrice: number;
    }[]>;
}
