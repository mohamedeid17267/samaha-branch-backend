import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Category } from '../../database/entities/category.entity';
import { Product } from '../../database/entities/product.entity';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService implements OnModuleInit {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async onModuleInit() {
    await this.seedDefaults();
  }

  async seedDefaults(): Promise<void> {
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
    } catch (e) {
      console.warn('[CategoriesService] Seed notice:', e);
    }
  }

  async findAll(): Promise<any[]> {
    const categories = await this.categoryRepository.find({
      order: { id: 'ASC' },
    });

    // Enrich each category with total products count and next SKU preview
    const enriched = await Promise.all(
      categories.map(async (cat) => {
        const productCount = await this.productRepository.count({
          where: { category: cat.name },
        });
        const skuInfo = await this.getNextSku(cat.prefix);
        return {
          ...cat,
          productCount,
          nextSku: skuInfo.nextSku,
        };
      }),
    );

    return enriched;
  }

  async findOne(id: number): Promise<Category> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(`التصنيف رقم ${id} غير موجود`);
    }
    return category;
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    const cleanName = (dto.name || '').trim();
    if (!cleanName) {
      throw new BadRequestException('اسم التصنيف مطلوب');
    }

    // 1. Clean or transliterate prefix
    let cleanPrefix = '';
    if (dto.prefix && dto.prefix.trim()) {
      cleanPrefix = this.transliterateToEnglish(dto.prefix.trim().toUpperCase());
      cleanPrefix = cleanPrefix.replace(/[^A-Z0-9]/g, '');
    }

    // If prefix is empty or wasn't provided, derive from category name
    if (!cleanPrefix) {
      cleanPrefix = this.derivePrefixFromName(cleanName);
    }

    // 2. Check if a category with this name already exists (Upsert logic)
    const existingName = await this.categoryRepository.findOne({
      where: { name: cleanName },
    });

    if (existingName) {
      // If the user is submitting an existing category, update prefix/description and return
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

    // 3. Check if prefix is already taken by another category, disambiguate if so
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

  private transliterateToEnglish(text: string): string {
    const map: Record<string, string> = {
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
      } else if (/[a-zA-Z0-9]/.test(char)) {
        out += char.toUpperCase();
      }
    }
    return out;
  }

  private derivePrefixFromName(name: string): string {
    const common: Record<string, string> = {
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
      if (name.includes(key)) return val;
    }
    const transliterated = this.transliterateToEnglish(name);
    if (transliterated.length >= 2) {
      return transliterated.slice(0, 3).toUpperCase();
    }
    return 'CAT';
  }

  async update(id: number, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findOne(id);

    if (dto.name && dto.name.trim() !== category.name) {
      const existingName = await this.categoryRepository.findOne({
        where: { name: dto.name.trim() },
      });
      if (existingName && existingName.id !== id) {
        throw new BadRequestException(`التصنيف باسم "${dto.name.trim()}" موجود بالفعل`);
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
          throw new BadRequestException(`الاختصار "${cleanPrefix}" مستخدم بالفعل`);
        }
        category.prefix = cleanPrefix;
      }
    }

    if (dto.description !== undefined) {
      category.description = dto.description?.trim();
    }

    return this.categoryRepository.save(category);
  }

  async remove(id: number): Promise<{ success: boolean; message: string }> {
    const category = await this.findOne(id);
    const count = await this.productRepository.count({
      where: { category: category.name },
    });
    if (count > 0) {
      throw new BadRequestException(
        `لا يمكن حذف التصنيف "${category.name}" لأنه مرتبط بـ ${count} منتج في النظام.`,
      );
    }
    await this.categoryRepository.remove(category);
    return { success: true, message: `تم حذف التصنيف "${category.name}" بنجاح` };
  }

  /**
   * Auto-generate the next barcode SKU for a given category name or prefix.
   * Format: [PREFIX]-[ITEM_NUMBER]-[SERIES]
   * Example:
   * First item: BR-100-1
   * Next: BR-101-1, BR-102-1 ...
   * When 100 items reached (100 to 199):
   * Item number resets to 100, and series number increments to 2: BR-100-2
   */
  async getNextSku(
    prefixOrCategory: string,
  ): Promise<{ nextSku: string; prefix: string; itemNum: number; series: number }> {
    let prefix = (prefixOrCategory || '').trim().toUpperCase();

    // Check if it's a category name in our database
    const foundCat = await this.categoryRepository.findOne({
      where: [{ name: prefixOrCategory }, { prefix }],
    });
    if (foundCat) {
      prefix = foundCat.prefix;
    } else {
      prefix = prefix.replace(/[^A-Z0-9]/g, '');
    }

    if (!prefix) {
      prefix = 'PR'; // Default fallback
    }

    // Query products whose SKU starts with this prefix
    const products = await this.productRepository
      .createQueryBuilder('p')
      .select(['p.sku'])
      .where('p.sku LIKE :prefixPattern', { prefixPattern: `${prefix}-%` })
      .getMany();

    // Regex to match: PREFIX-NUMBER-SERIES (e.g. BR-100-1, BR-136-2)
    const regex = new RegExp(`^${prefix}-(\\d+)-(\\d+)$`, 'i');

    let maxSeries = 1;
    let maxNumForMaxSeries = 99; // so 1st item becomes 100
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
        } else if (series === maxSeries) {
          if (num > maxNumForMaxSeries) {
            maxNumForMaxSeries = num;
          }
        }
      }
    }

    let nextNum: number;
    let nextSeries: number;

    if (!hasMatchingItems) {
      nextNum = 100;
      nextSeries = 1;
    } else {
      // If we reached 199 (100 items: 100..199), roll number back to 100 and increment series
      if (maxNumForMaxSeries >= 199) {
        nextNum = 100;
        nextSeries = maxSeries + 1;
      } else {
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
}
