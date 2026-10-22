import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Category } from '../../database/entities/category.entity';
import { Product } from '../../database/entities/product.entity';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/create-category.dto';
export declare class CategoriesService implements OnModuleInit {
    private categoryRepository;
    private productRepository;
    constructor(categoryRepository: Repository<Category>, productRepository: Repository<Product>);
    onModuleInit(): Promise<void>;
    seedDefaults(): Promise<void>;
    findAll(): Promise<any[]>;
    findOne(id: number): Promise<Category>;
    create(dto: CreateCategoryDto): Promise<Category>;
    private transliterateToEnglish;
    private derivePrefixFromName;
    update(id: number, dto: UpdateCategoryDto): Promise<Category>;
    remove(id: number): Promise<{
        success: boolean;
        message: string;
    }>;
    getNextSku(prefixOrCategory: string): Promise<{
        nextSku: string;
        prefix: string;
        itemNum: number;
        series: number;
    }>;
}
