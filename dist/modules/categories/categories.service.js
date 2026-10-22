"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoriesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const category_entity_1 = require("../../database/entities/category.entity");
const product_entity_1 = require("../../database/entities/product.entity");
let CategoriesService = class CategoriesService {
    categoryRepository;
    productRepository;
    constructor(categoryRepository, productRepository) {
        this.categoryRepository = categoryRepository;
        this.productRepository = productRepository;
    }
    async onModuleInit() {
        await this.seedDefaults();
    }
    async seedDefaults() {
        try {
            const count = await this.categoryRepository.count();
            if (count === 0) {
                const defaults = [
                    { name: 'برسيلت', prefix: 'BR', description: 'أساور وبرسيلت' },
                    { name: 'سلاسل', prefix: 'NK', description: 'سلاسل وقلادات' },
                    { name: 'خواتم', prefix: 'RG', description: 'خواتم ودبل' },
                    { name: 'انسيالات', prefix: 'AN', description: 'انسيالات متنوعة' },
                    { name: 'حلقان', prefix: 'ER', description: 'أقراط وحلقان' },
                    { name: 'ساعات', prefix: 'WT', description: 'ساعات وإكسسوارات' },
                    { name: 'هاند شين', prefix: 'HC', description: 'هاند شين وسلاسل يد' },
                ];
                for (const item of defaults) {
                    const cat = this.categoryRepository.create(item);
                    await this.categoryRepository.save(cat);
                }
            }
        }
        catch (e) {
            console.warn('[CategoriesService] Seed notice:', e);
        }
    }
    async findAll() {
        const categories = await this.categoryRepository.find({
            order: { id: 'ASC' },
        });
        const enriched = await Promise.all(categories.map(async (cat) => {
            const productCount = await this.productRepository.count({
                where: { category: cat.name },
            });
            const skuInfo = await this.getNextSku(cat.prefix);
            return {
                ...cat,
                productCount,
                nextSku: skuInfo.nextSku,
            };
        }));
        return enriched;
    }
    async findOne(id) {
        const category = await this.categoryRepository.findOne({ where: { id } });
        if (!category) {
            throw new common_1.NotFoundException(`التصنيف رقم ${id} غير موجود`);
        }
        return category;
    }
    async create(dto) {
        const cleanName = (dto.name || '').trim();
        if (!cleanName) {
            throw new common_1.BadRequestException('اسم التصنيف مطلوب');
        }
        let cleanPrefix = '';
        if (dto.prefix && dto.prefix.trim()) {
            cleanPrefix = this.transliterateToEnglish(dto.prefix.trim().toUpperCase());
            cleanPrefix = cleanPrefix.replace(/[^A-Z0-9]/g, '');
        }
        if (!cleanPrefix) {
            cleanPrefix = this.derivePrefixFromName(cleanName);
        }
        const existingName = await this.categoryRepository.findOne({
            where: { name: cleanName },
        });
        if (existingName) {
            if (cleanPrefix && existingName.prefix !== cleanPrefix) {
                const otherWithPrefix = await this.categoryRepository.findOne({
                    where: { prefix: cleanPrefix },
                });
                if (otherWithPrefix && otherWithPrefix.id !== existingName.id) {
                    cleanPrefix = `${cleanPrefix}${existingName.id}`;
                }
                existingName.prefix = cleanPrefix;
            }
            if (dto.description !== undefined) {
                existingName.description = dto.description?.trim();
            }
            return this.categoryRepository.save(existingName);
        }
        let finalPrefix = cleanPrefix;
        let disambiguationCounter = 1;
        while (await this.categoryRepository.findOne({ where: { prefix: finalPrefix } })) {
            finalPrefix = `${cleanPrefix}${disambiguationCounter}`;
            disambiguationCounter++;
        }
        const category = this.categoryRepository.create({
            name: cleanName,
            prefix: finalPrefix,
            description: dto.description?.trim(),
        });
        return this.categoryRepository.save(category);
    }
    transliterateToEnglish(text) {
        const map = {
            'ا': 'A', 'أ': 'A', 'إ': 'E', 'آ': 'A', 'ء': 'A',
            'ب': 'B', 'ت': 'T', 'ث': 'TH', 'ج': 'G', 'ح': 'H',
            'خ': 'KH', 'د': 'D', 'ذ': 'Z', 'ر': 'R', 'ز': 'Z',
            'س': 'S', 'ش': 'SH', 'ص': 'S', 'ض': 'D', 'ط': 'T',
            'ظ': 'Z', 'ع': 'A', 'غ': 'GH', 'ف': 'F', 'ق': 'Q',
            'ك': 'K', 'ل': 'L', 'م': 'M', 'ن': 'N', 'ه': 'H',
            'و': 'W', 'ي': 'Y', 'ى': 'Y', 'ة': 'H', 'ئ': 'Y', 'ؤ': 'W',
        };
        let out = '';
        for (const char of text) {
            if (map[char]) {
                out += map[char];
            }
            else if (/[a-zA-Z0-9]/.test(char)) {
                out += char.toUpperCase();
            }
        }
        return out;
    }
    derivePrefixFromName(name) {
        const common = {
            'سلاسل': 'NK',
            'سلسلة': 'NK',
            'قلادة': 'NK',
            'برسيلت': 'BR',
            'اسورة': 'BR',
            'أساور': 'BR',
            'خواتم': 'RG',
            'خاتم': 'RG',
            'دبلة': 'RG',
            'انسيالات': 'AN',
            'انسيال': 'AN',
            'حلقان': 'ER',
            'حلق': 'ER',
            'أقراط': 'ER',
            'ساعات': 'WT',
            'ساعة': 'WT',
            'هاند شين': 'HC',
            'ميداليات': 'MD',
            'ميدالية': 'MD',
            'بروش': 'PR',
            'خلخال': 'AK',
        };
        for (const [key, val] of Object.entries(common)) {
            if (name.includes(key))
                return val;
        }
        const transliterated = this.transliterateToEnglish(name);
        if (transliterated.length >= 2) {
            return transliterated.slice(0, 3).toUpperCase();
        }
        return 'CAT';
    }
    async update(id, dto) {
        const category = await this.findOne(id);
        if (dto.name && dto.name.trim() !== category.name) {
            const existingName = await this.categoryRepository.findOne({
                where: { name: dto.name.trim() },
            });
            if (existingName && existingName.id !== id) {
                throw new common_1.BadRequestException(`التصنيف باسم "${dto.name.trim()}" موجود بالفعل`);
            }
            category.name = dto.name.trim();
        }
        if (dto.prefix) {
            const cleanPrefix = dto.prefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
            if (cleanPrefix !== category.prefix) {
                const existingPrefix = await this.categoryRepository.findOne({
                    where: { prefix: cleanPrefix },
                });
                if (existingPrefix && existingPrefix.id !== id) {
                    throw new common_1.BadRequestException(`الاختصار "${cleanPrefix}" مستخدم بالفعل`);
                }
                category.prefix = cleanPrefix;
            }
        }
        if (dto.description !== undefined) {
            category.description = dto.description?.trim();
        }
        return this.categoryRepository.save(category);
    }
    async remove(id) {
        const category = await this.findOne(id);
        const count = await this.productRepository.count({
            where: { category: category.name },
        });
        if (count > 0) {
            throw new common_1.BadRequestException(`لا يمكن حذف التصنيف "${category.name}" لأنه مرتبط بـ ${count} منتج في النظام.`);
        }
        await this.categoryRepository.remove(category);
        return { success: true, message: `تم حذف التصنيف "${category.name}" بنجاح` };
    }
    async getNextSku(prefixOrCategory) {
        let prefix = (prefixOrCategory || '').trim().toUpperCase();
        const foundCat = await this.categoryRepository.findOne({
            where: [{ name: prefixOrCategory }, { prefix }],
        });
        if (foundCat) {
            prefix = foundCat.prefix;
        }
        else {
            prefix = prefix.replace(/[^A-Z0-9]/g, '');
        }
        if (!prefix) {
            prefix = 'PR';
        }
        const products = await this.productRepository
            .createQueryBuilder('p')
            .select(['p.sku'])
            .where('p.sku LIKE :prefixPattern', { prefixPattern: `${prefix}-%` })
            .getMany();
        const regex = new RegExp(`^${prefix}-(\\d+)-(\\d+)$`, 'i');
        let maxSeries = 1;
        let maxNumForMaxSeries = 99;
        let hasMatchingItems = false;
        for (const prod of products) {
            const match = prod.sku?.match(regex);
            if (match) {
                hasMatchingItems = true;
                const num = parseInt(match[1], 10);
                const series = parseInt(match[2], 10);
                if (series > maxSeries) {
                    maxSeries = series;
                    maxNumForMaxSeries = num;
                }
                else if (series === maxSeries) {
                    if (num > maxNumForMaxSeries) {
                        maxNumForMaxSeries = num;
                    }
                }
            }
        }
        let nextNum;
        let nextSeries;
        if (!hasMatchingItems) {
            nextNum = 100;
            nextSeries = 1;
        }
        else {
            if (maxNumForMaxSeries >= 199) {
                nextNum = 100;
                nextSeries = maxSeries + 1;
            }
            else {
                nextNum = Math.max(100, maxNumForMaxSeries + 1);
                nextSeries = maxSeries;
            }
        }
        const nextSku = `${prefix}-${nextNum}-${nextSeries}`;
        return {
            nextSku,
            prefix,
            itemNum: nextNum,
            series: nextSeries,
        };
    }
};
exports.CategoriesService = CategoriesService;
exports.CategoriesService = CategoriesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(category_entity_1.Category)),
    __param(1, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], CategoriesService);
//# sourceMappingURL=categories.service.js.map