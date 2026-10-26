import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BranchScopeGuard } from '../../common/guards/branch-scope.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleEnum } from '../../common/enums/role.enum';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { User } from '../../database/entities/user.entity';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles(RoleEnum.HQ_ADMIN, RoleEnum.HQ_STAFF)
  async create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Post('local')
  @UseGuards(BranchScopeGuard)
  async createLocal(
    @Body() createProductDto: CreateProductDto,
    @Body('branchId') explicitBranchId: number,
    @GetUser() user: User,
  ) {
    const targetBranchId = Number(user?.branchId) || Number(explicitBranchId) || 3;
    return this.productsService.createLocal(
      createProductDto,
      targetBranchId,
    );
  }

  @Post('import-csv')
  @Roles(RoleEnum.HQ_ADMIN, RoleEnum.HQ_STAFF)
  async importCsv(@Body('csvText') csvText: string, @GetUser() user: User) {
    return this.productsService.importCsv(csvText, user.username);
  }

  @Get()
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.productsService.findAll(
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      search,
    );
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.HQ_ADMIN, RoleEnum.HQ_STAFF, RoleEnum.BRANCH_MANAGER)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: any,
    @GetUser() user: User,
  ) {
    return this.productsService.update(id, updateProductDto, user?.username || 'Admin');
  }

  @Delete(':id')
  @Roles(RoleEnum.HQ_ADMIN, RoleEnum.HQ_STAFF)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.remove(id);
  }

  @Patch(':id/stock')
  @Roles(RoleEnum.HQ_ADMIN, RoleEnum.HQ_STAFF)
  async updateGlobalStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStockDto: UpdateStockDto,
  ) {
    return this.productsService.updateGlobalStock(id, updateStockDto.quantity);
  }

  // Multi-tenant scoped endpoint: Gets branch's specific inventory level.
  @Get('branch/:branchId')
  @UseGuards(BranchScopeGuard)
  async getBranchInventory(
    @Param('branchId', ParseIntPipe) branchId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.productsService.getBranchInventory(
      branchId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 5000,
      search,
    );
  }

  @Post('branch/:branchId/sale')
  @UseGuards(BranchScopeGuard)
  async recordSale(
    @Param('branchId', ParseIntPipe) branchId: number,
    @Body('productId', ParseIntPipe) productId: number,
    @Body('quantity', ParseIntPipe) quantity: number,
    @Body('sellingPrice') sellingPrice: number,
    @GetUser() user: User,
  ) {
    return this.productsService.recordSale(
      branchId,
      productId,
      quantity,
      Number(sellingPrice),
      user.username,
    );
  }

  @Post('branch/:branchId/waste')
  @UseGuards(BranchScopeGuard)
  async recordWaste(
    @Param('branchId', ParseIntPipe) branchId: number,
    @Body('productId', ParseIntPipe) productId: number,
    @Body('quantity', ParseIntPipe) quantity: number,
    @Body('reason') reason: string,
    @GetUser() user: User,
  ) {
    return this.productsService.recordWaste(
      branchId,
      productId,
      quantity,
      reason,
      user.username,
    );
  }
  @Patch('branch/:branchId/inventory/:productId/price')
  @UseGuards(BranchScopeGuard)
  async updateSellingPrice(
    @Param('branchId', ParseIntPipe) branchId: number,
    @Param('productId', ParseIntPipe) productId: number,
    @GetUser() user: User,
    @Body('sellingPrice') sellingPrice?: number,
    @Body('retailPrice') retailPrice?: number,
    @Body('wholesalePrice') wholesalePrice?: number,
    @Body('websitePrice') websitePrice?: number,
    @Body('costPrice') costPrice?: number,
  ) {
    return this.productsService.updateSellingPrice(
      branchId,
      productId,
      sellingPrice !== undefined ? Number(sellingPrice) : undefined,
      user.username,
      {
        retailPrice: retailPrice !== undefined ? Number(retailPrice) : undefined,
        wholesalePrice: wholesalePrice !== undefined ? Number(wholesalePrice) : undefined,
        websitePrice: websitePrice !== undefined ? Number(websitePrice) : undefined,
        costPrice: costPrice !== undefined ? Number(costPrice) : undefined,
      },
    );
  }

  @Patch('branch/:branchId/product/:productId')
  @UseGuards(BranchScopeGuard)
  async updateBranchProduct(
    @Param('branchId', ParseIntPipe) branchId: number,
    @Param('productId', ParseIntPipe) productId: number,
    @GetUser() user: User,
    @Body() updateDto: any,
  ) {
    return this.productsService.updateBranchProduct(
      branchId,
      productId,
      updateDto,
      user?.username || 'Branch User',
    );
  }

  @Post('branch/:branchId/stock-in')
  @UseGuards(BranchScopeGuard)
  async stockIn(
    @Param('branchId', ParseIntPipe) branchId: number,
    @Body('sku') sku: string,
    @Body('barcode') barcode: string,
    @Body('quantity') quantity: number,
    @Body('sessionId') sessionId: string,
    @GetUser() user: User,
  ) {
    const code = sku || barcode;
    return this.productsService.stockIn(
      branchId,
      code,
      quantity ? Number(quantity) : 1,
      user.username,
      sessionId,
    );
  }

  @Get('branch/:branchId/by-code/:code')
  @UseGuards(BranchScopeGuard)
  async findByCode(
    @Param('branchId', ParseIntPipe) branchId: number,
    @Param('code') code: string,
  ) {
    return this.productsService.findByBarcodeOrSku(branchId, code);
  }

  @Get(':id/movements')
  async getProductStockMovements(
    @Param('id', ParseIntPipe) id: number,
    @Query('branchId') branchId?: number,
    @Query('limit') limit?: number,
  ) {
    return this.productsService.getProductStockMovements(
      id,
      branchId ? Number(branchId) : undefined,
      limit ? Number(limit) : 100,
    );
  }

  @Post(':id/adjust-stock')
  async adjustStock(
    @Param('id', ParseIntPipe) id: number,
    @Body('branchId') branchId: number,
    @Body('newQuantity') newQuantity: number,
    @Body('reason') reason: string,
    @GetUser() user: User,
  ) {
    return this.productsService.adjustStock(
      Number(branchId),
      id,
      Number(newQuantity),
      reason,
      user?.username || 'System',
    );
  }
}
