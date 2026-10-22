import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/create-category.dto';
export declare class CategoriesController {
    private readonly categoriesService;
    constructor(categoriesService: CategoriesService);
    findAll(): Promise<any[]>;
    getNextSku(prefix?: string, category?: string): Promise<{
        nextSku: string;
        prefix: string;
        itemNum: number;
        series: number;
    }>;
    findOne(id: number): Promise<import("../../database/entities/category.entity").Category>;
    create(createCategoryDto: CreateCategoryDto): Promise<import("../../database/entities/category.entity").Category>;
    update(id: number, updateCategoryDto: UpdateCategoryDto): Promise<import("../../database/entities/category.entity").Category>;
    remove(id: number): Promise<{
        success: boolean;
        message: string;
    }>;
}
