export declare class CreateProductDto {
    sku: string;
    supplierCode?: string;
    name: string;
    costPrice: number;
    standardDistributerPrice?: number;
    retailPrice?: number;
    wholesalePrice?: number;
    websitePrice?: number;
    images?: string[];
    globalStock?: number;
    category?: string;
    dozenPrice?: number;
}
