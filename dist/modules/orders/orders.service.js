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
exports.OrdersService = void 0;
const brand_royalty_ledger_entity_1 = require("../../database/entities/brand-royalty-ledger.entity");
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const purchase_order_entity_1 = require("../../database/entities/purchase-order.entity");
const order_item_entity_1 = require("../../database/entities/order-item.entity");
const product_entity_1 = require("../../database/entities/product.entity");
const branch_inventory_entity_1 = require("../../database/entities/branch-inventory.entity");
const inventory_debt_ledger_entity_1 = require("../../database/entities/inventory-debt-ledger.entity");
const stock_movement_entity_1 = require("../../database/entities/stock-movement.entity");
const branch_entity_1 = require("../../database/entities/branch.entity");
const customer_entity_1 = require("../../database/entities/customer.entity");
const customer_debt_ledger_entity_1 = require("../../database/entities/customer-debt-ledger.entity");
const order_status_enum_1 = require("../../common/enums/order-status.enum");
const transaction_type_enum_1 = require("../../common/enums/transaction-type.enum");
const activity_service_1 = require("../activity/activity.service");
const website_sync_service_1 = require("../../common/services/website-sync.service");
let OrdersService = class OrdersService {
    orderRepository;
    productRepository;
    dataSource;
    activityService;
    async deleteOrder(id, username) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const order = await queryRunner.manager.findOne(purchase_order_entity_1.PurchaseOrder, {
                where: { id },
                relations: { items: true }
            });
            if (!order)
                throw new common_1.NotFoundException('Order not found');
            let targetIdParam = null;
            if (order.customerId) {
                await queryRunner.manager.delete(customer_debt_ledger_entity_1.CustomerDebtLedger, { relatedOrderId: order.id });
                targetIdParam = order.customerId;
            }
            else if (order.branchId) {
                await queryRunner.manager.delete(inventory_debt_ledger_entity_1.InventoryDebtLedger, { relatedOrderId: order.id });
                await queryRunner.manager.delete(brand_royalty_ledger_entity_1.BrandRoyaltyLedger, { relatedOrderId: order.id });
                targetIdParam = order.branchId;
            }
            await queryRunner.manager.remove(order);
            await queryRunner.commitTransaction();
            if (targetIdParam) {
                if (order.customerId) {
                }
                else if (order.branchId) {
                }
            }
            await this.activityService.createAuditLog(username, 'حذف فاتورة', `تم حذف الفاتورة رقم ${order.id}`);
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
    constructor(orderRepository, productRepository, dataSource, activityService) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.dataSource = dataSource;
        this.activityService = activityService;
    }
    async create(createOrderDto, username = 'System') {
        const { branchId, items } = createOrderDto;
        if (!items || items.length === 0) {
            throw new common_1.BadRequestException('Order must contain at least one item');
        }
        return this.dataSource.transaction(async (manager) => {
            let totalAmount = 0;
            const orderItems = [];
            for (const itemDto of items) {
                const product = await manager.findOne(product_entity_1.Product, {
                    where: { id: itemDto.productId },
                });
                if (!product) {
                    throw new common_1.NotFoundException(`Product with ID ${itemDto.productId} not found`);
                }
                const isDozen = itemDto.sellType === 'DOZEN';
                const price = isDozen
                    ? Number(product.dozenPrice)
                    : Number(product.standardDistributerPrice);
                const subtotal = price * itemDto.quantity;
                totalAmount += subtotal;
                const orderItem = manager.create(order_item_entity_1.OrderItem, {
                    productId: product.id,
                    quantity: itemDto.quantity,
                    unitPrice: price,
                    sellType: itemDto.sellType || 'PIECE',
                });
                orderItems.push(orderItem);
            }
            const branch = await manager.findOne(branch_entity_1.Branch, { where: { id: branchId } });
            const branchName = branch ? branch.name : `فرع #${branchId}`;
            const discountPercentage = Number(createOrderDto.discountPercentage || 0);
            const discountAmount = totalAmount * (discountPercentage / 100);
            const finalTotalAmount = totalAmount - discountAmount;
            const order = manager.create(purchase_order_entity_1.PurchaseOrder, {
                branchId,
                status: order_status_enum_1.OrderStatus.PENDING,
                totalAmount: finalTotalAmount,
                discountPercentage,
                items: orderItems,
            });
            const res = await manager.save(order);
            await this.activityService.createAuditLog(username, 'إنشاء طلب شراء', `قام بإنشاء طلب توريد مخزون جديد بقيمة $${finalTotalAmount} لـ ${branchName}`);
            await this.activityService.createNotification({
                message: `طلب شراء جديد رقم #${res.id} بانتظار الاعتماد المالي لـ ${branchName} بقيمة $${finalTotalAmount}`,
                type: 'WARNING',
            });
            return res;
        });
    }
    async findAll(branchId, status, page = 1, limit = 10, customerId, targetType) {
        const where = {};
        if (branchId) {
            where.branchId = branchId;
        }
        if (customerId) {
            where.customerId = customerId;
        }
        if (targetType === 'BRANCH') {
            where.customerId = (0, typeorm_2.IsNull)();
        }
        else if (targetType === 'CUSTOMER') {
            where.branchId = (0, typeorm_2.IsNull)();
        }
        if (status) {
            where.status = status;
        }
        const [data, total] = await this.orderRepository.findAndCount({
            where,
            relations: { items: { product: true }, branch: true, customer: true },
            skip: (page - 1) * limit,
            take: limit,
            order: { createdAt: 'DESC' },
        });
        return {
            data,
            total,
            page,
            limit,
        };
    }
    async findOne(id) {
        const order = await this.orderRepository.findOne({
            where: { id },
            relations: { items: { product: true }, branch: true, customer: true },
        });
        if (!order) {
            throw new common_1.NotFoundException(`Purchase Order with ID ${id} not found`);
        }
        return order;
    }
    async updateStatus(id, updateDto, username = 'System') {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const order = await queryRunner.manager.findOne(purchase_order_entity_1.PurchaseOrder, {
                where: { id },
                relations: { items: { product: true }, branch: true },
            });
            if (!order) {
                throw new common_1.NotFoundException(`Purchase Order with ID ${id} not found`);
            }
            const currentStatus = order.status;
            const targetStatus = updateDto.status;
            if (currentStatus === targetStatus) {
                throw new common_1.BadRequestException(`Order is already in status ${targetStatus}`);
            }
            if (currentStatus === order_status_enum_1.OrderStatus.DELIVERED) {
                throw new common_1.BadRequestException('Cannot change status of a completed and delivered order');
            }
            const branchName = order.branch
                ? order.branch.name
                : `فرع #${order.branchId}`;
            if (targetStatus === order_status_enum_1.OrderStatus.APPROVED) {
                if (currentStatus !== order_status_enum_1.OrderStatus.PENDING) {
                    throw new common_1.BadRequestException('Can only approve order from PENDING status');
                }
                if (updateDto.items && updateDto.items.length > 0) {
                    await queryRunner.manager.delete(order_item_entity_1.OrderItem, {
                        purchaseOrderId: order.id,
                    });
                    let totalAmount = 0;
                    const orderItems = [];
                    for (const itemDto of updateDto.items) {
                        const product = await queryRunner.manager.findOne(product_entity_1.Product, {
                            where: { id: itemDto.productId },
                        });
                        if (!product) {
                            throw new common_1.NotFoundException(`Product with ID ${itemDto.productId} not found`);
                        }
                        const isDozen = itemDto.sellType === 'DOZEN';
                        const price = isDozen
                            ? Number(product.dozenPrice)
                            : Number(product.standardDistributerPrice);
                        const subtotal = price * itemDto.quantity;
                        totalAmount += subtotal;
                        const orderItem = queryRunner.manager.create(order_item_entity_1.OrderItem, {
                            purchaseOrderId: order.id,
                            productId: product.id,
                            quantity: itemDto.quantity,
                            unitPrice: price,
                            sellType: itemDto.sellType || 'PIECE',
                        });
                        orderItems.push(orderItem);
                    }
                    order.items = await queryRunner.manager.save(orderItems);
                    order.totalAmount = totalAmount;
                }
                order.status = order_status_enum_1.OrderStatus.APPROVED;
                await this.activityService.createAuditLog(username, 'اعتماد طلب الشراء', `تم اعتماد طلب الشراء رقم #${order.id} لـ ${branchName} بقيمة $${order.totalAmount}`);
                await this.activityService.createNotification({
                    branchId: order.branchId,
                    message: `تم اعتماد طلب الشراء الخاص بكم رقم #${order.id} بقيمة $${order.totalAmount} وهو قيد التجهيز الآن`,
                    type: 'SUCCESS',
                });
            }
            else if (targetStatus === order_status_enum_1.OrderStatus.SHIPPED) {
                if (currentStatus !== order_status_enum_1.OrderStatus.APPROVED) {
                    throw new common_1.BadRequestException('Can only ship an APPROVED order');
                }
                for (const item of order.items) {
                    const product = await queryRunner.manager.findOne(product_entity_1.Product, {
                        where: { id: item.productId },
                        lock: { mode: 'pessimistic_write' },
                    });
                    if (!product) {
                        throw new common_1.NotFoundException(`Product with ID ${item.productId} not found`);
                    }
                    const deductQty = item.sellType === 'DOZEN' ? item.quantity * 12 : item.quantity;
                    if (product.globalStock < deductQty) {
                        throw new common_1.BadRequestException(`Insufficient global stock for Product: ${product.name} (SKU: ${product.sku}). Available: ${product.globalStock}, Required: ${deductQty} pieces`);
                    }
                    product.globalStock -= deductQty;
                    await queryRunner.manager.save(product);
                }
                order.status = order_status_enum_1.OrderStatus.SHIPPED;
                await this.activityService.createAuditLog(username, 'شحن الطلب', `شحن البضائع للطلب #${order.id} لـ ${branchName}`);
                await this.activityService.createNotification({
                    branchId: order.branchId,
                    message: `جاري شحن بضائع طلب التوريد رقم #${order.id}. يرجى تأكيد الاستلام فور وصولها لمخازن الفرع`,
                    type: 'INFO',
                });
            }
            else if (targetStatus === order_status_enum_1.OrderStatus.DELIVERED) {
                if (currentStatus !== order_status_enum_1.OrderStatus.SHIPPED) {
                    throw new common_1.BadRequestException('Can only deliver a SHIPPED order');
                }
                const branchId = order.branchId;
                for (const item of order.items) {
                    let branchInv = await queryRunner.manager.findOne(branch_inventory_entity_1.BranchInventory, {
                        where: { branchId, productId: item.productId },
                        lock: { mode: 'pessimistic_write' },
                    });
                    const addQty = item.sellType === 'DOZEN' ? item.quantity * 12 : item.quantity;
                    const prevQty = branchInv ? Number(branchInv.currentQuantity || 0) : 0;
                    if (!branchInv) {
                        branchInv = queryRunner.manager.create(branch_inventory_entity_1.BranchInventory, {
                            branchId,
                            productId: item.productId,
                            currentQuantity: addQty,
                        });
                    }
                    else {
                        branchInv.currentQuantity = prevQty + addQty;
                    }
                    const savedInv = await queryRunner.manager.save(branchInv);
                    const movement = queryRunner.manager.create(stock_movement_entity_1.StockMovement, {
                        productId: item.productId,
                        branchId,
                        type: stock_movement_entity_1.StockMovementType.IN_SUPPLY,
                        quantity: addQty,
                        balanceBefore: prevQty,
                        balanceAfter: savedInv.currentQuantity,
                        referenceType: 'ORDER',
                        referenceId: String(order.id),
                        notes: `استلام شحنة طلبية من الإدارة رقم #${order.id}`,
                        performedBy: username,
                    });
                    await queryRunner.manager.save(movement);
                    queryRunner.manager
                        .findOne(product_entity_1.Product, { where: { id: item.productId } })
                        .then((p) => {
                        if (p?.sku) {
                            new website_sync_service_1.WebsiteSyncService().syncStock(p.sku, savedInv.currentQuantity, {
                                price: Number(p.websitePrice || p.retailPrice || 0),
                                wholesalePrice: Number(p.wholesalePrice || 0),
                            }).catch(() => { });
                        }
                    })
                        .catch(() => { });
                }
                const lastLedgerEntry = await queryRunner.manager.findOne(inventory_debt_ledger_entity_1.InventoryDebtLedger, {
                    where: { branchId },
                    order: { id: 'DESC' },
                    lock: { mode: 'pessimistic_write' },
                });
                const currentBalance = lastLedgerEntry
                    ? Number(lastLedgerEntry.balanceAfter)
                    : 0;
                const chargeAmount = Number(order.totalAmount);
                const newBalance = currentBalance + chargeAmount;
                const ledgerEntry = queryRunner.manager.create(inventory_debt_ledger_entity_1.InventoryDebtLedger, {
                    branchId,
                    transactionType: transaction_type_enum_1.TransactionType.CHARGE,
                    relatedOrderId: order.id,
                    amount: chargeAmount,
                    balanceAfter: newBalance,
                    description: `Charged for batch delivery of Purchase Order #${order.id}`,
                });
                await queryRunner.manager.save(ledgerEntry);
                order.status = order_status_enum_1.OrderStatus.DELIVERED;
                await this.activityService.createAuditLog(username, 'تأكيد الاستلام والتفريغ', `أكد استلام البضائع للطلب #${order.id} لـ ${branchName} وتسجيل مديونية بقيمة $${order.totalAmount}`);
                await this.activityService.createNotification({
                    message: `أكد فرع ${branchName} استلام وتوريد شحنة الطلب رقم #${order.id} بنجاح`,
                    type: 'SUCCESS',
                });
            }
            const savedOrder = await queryRunner.manager.save(order);
            await queryRunner.commitTransaction();
            return savedOrder;
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
    async createInvoiceFromHq(createOrderDto, username = 'System') {
        const { branchId, customerId, targetType, items } = createOrderDto;
        const isCustomer = targetType === 'CUSTOMER' || customerId != null;
        if (!isCustomer && !branchId) {
            throw new common_1.BadRequestException('يجب تحديد الفرع المصدر له الفاتورة');
        }
        if (isCustomer && !customerId) {
            throw new common_1.BadRequestException('يجب تحديد العميل المصدر له الفاتورة');
        }
        if (!items || items.length === 0) {
            throw new common_1.BadRequestException('Invoice must contain at least one item');
        }
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            let targetName = '';
            if (isCustomer) {
                const customer = await queryRunner.manager.findOne(customer_entity_1.Customer, {
                    where: { id: customerId },
                });
                if (!customer)
                    throw new common_1.NotFoundException(`Customer with ID ${customerId} not found`);
                targetName = customer.name;
            }
            else {
                const branch = await queryRunner.manager.findOne(branch_entity_1.Branch, {
                    where: { id: branchId },
                });
                if (!branch)
                    throw new common_1.NotFoundException(`Branch with ID ${branchId} not found`);
                targetName = branch.name;
            }
            let totalAmount = 0;
            const orderItems = [];
            for (const itemDto of items) {
                const product = await queryRunner.manager.findOne(product_entity_1.Product, {
                    where: { id: itemDto.productId },
                    lock: { mode: 'pessimistic_write' },
                });
                if (!product) {
                    throw new common_1.NotFoundException(`Product with ID ${itemDto.productId} not found`);
                }
                const deductQty = itemDto.sellType === 'DOZEN'
                    ? itemDto.quantity * 12
                    : itemDto.quantity;
                if (product.globalStock < deductQty) {
                    throw new common_1.BadRequestException(`Insufficient global stock for Product: ${product.name} (SKU: ${product.sku}). Available: ${product.globalStock}, Required: ${deductQty} pieces`);
                }
                product.globalStock -= deductQty;
                await queryRunner.manager.save(product);
                const price = itemDto.sellType === 'DOZEN'
                    ? Number(product.dozenPrice)
                    : Number(product.standardDistributerPrice);
                const subtotal = price * itemDto.quantity;
                totalAmount += subtotal;
                const orderItem = queryRunner.manager.create(order_item_entity_1.OrderItem, {
                    productId: product.id,
                    quantity: itemDto.quantity,
                    unitPrice: price,
                    sellType: itemDto.sellType || 'PIECE',
                });
                orderItems.push(orderItem);
            }
            const discountPercentage = Number(createOrderDto.discountPercentage || 0);
            const discountAmount = totalAmount * (discountPercentage / 100);
            const finalTotalAmount = totalAmount - discountAmount;
            const initialPaidAmount = Number(createOrderDto.initialPaidAmount || 0);
            if (initialPaidAmount > finalTotalAmount) {
                throw new common_1.BadRequestException(`مبلغ الدفعة المقدمة (${initialPaidAmount} ج.م) لا يمكن أن يتجاوز قيمة الفاتورة الإجمالية بعد الخصم (${finalTotalAmount} ج.م)`);
            }
            const order = queryRunner.manager.create(purchase_order_entity_1.PurchaseOrder, {
                branchId: isCustomer ? undefined : branchId,
                customerId: isCustomer ? customerId : undefined,
                status: order_status_enum_1.OrderStatus.DELIVERED,
                totalAmount: finalTotalAmount,
                paidAmount: initialPaidAmount,
                discountPercentage,
                items: orderItems,
            });
            const savedOrder = await queryRunner.manager.save(order);
            const chargeAmount = Number(finalTotalAmount);
            if (isCustomer) {
                const customer = await queryRunner.manager.findOne(customer_entity_1.Customer, {
                    where: { id: customerId },
                    lock: { mode: 'pessimistic_write' },
                });
                if (!customer)
                    throw new common_1.NotFoundException(`Customer with ID ${customerId} not found`);
                const currentBalance = Number(customer.currentDebt);
                let newBalance = currentBalance + chargeAmount;
                const chargeEntry = queryRunner.manager.create(customer_debt_ledger_entity_1.CustomerDebtLedger, {
                    customerId: customerId,
                    transactionType: transaction_type_enum_1.TransactionType.CHARGE,
                    relatedOrderId: savedOrder.id,
                    amount: chargeAmount,
                    balanceAfter: newBalance,
                    description: `فاتورة بيع رقم #${savedOrder.id} (الإجمالي)`,
                });
                await queryRunner.manager.save(chargeEntry);
                if (initialPaidAmount > 0) {
                    newBalance -= initialPaidAmount;
                    const paymentEntry = queryRunner.manager.create(customer_debt_ledger_entity_1.CustomerDebtLedger, {
                        customerId: customerId,
                        transactionType: transaction_type_enum_1.TransactionType.PAYMENT,
                        relatedOrderId: savedOrder.id,
                        amount: initialPaidAmount,
                        balanceAfter: newBalance,
                        description: `سداد دفعة مقدمة لفاتورة رقم #${savedOrder.id}`,
                    });
                    await queryRunner.manager.save(paymentEntry);
                }
                customer.currentDebt = newBalance;
                await queryRunner.manager.save(customer);
                await this.activityService.createAuditLog(username, 'إصدار فاتورة عميل', `أصدر فاتورة بيع رقم #${savedOrder.id} للعميل ${targetName} بقيمة ${finalTotalAmount} ج.م`);
            }
            else {
                for (const item of orderItems) {
                    let branchInv = await queryRunner.manager.findOne(branch_inventory_entity_1.BranchInventory, {
                        where: { branchId, productId: item.productId },
                        lock: { mode: 'pessimistic_write' },
                    });
                    const addQty = item.sellType === 'DOZEN' ? item.quantity * 12 : item.quantity;
                    const prevQty = branchInv ? Number(branchInv.currentQuantity || 0) : 0;
                    if (!branchInv) {
                        branchInv = queryRunner.manager.create(branch_inventory_entity_1.BranchInventory, {
                            branchId,
                            productId: item.productId,
                            currentQuantity: addQty,
                        });
                    }
                    else {
                        branchInv.currentQuantity = prevQty + addQty;
                    }
                    const savedInv = await queryRunner.manager.save(branchInv);
                    const movement = queryRunner.manager.create(stock_movement_entity_1.StockMovement, {
                        productId: item.productId,
                        branchId,
                        type: stock_movement_entity_1.StockMovementType.IN_SUPPLY,
                        quantity: addQty,
                        balanceBefore: prevQty,
                        balanceAfter: savedInv.currentQuantity,
                        referenceType: 'ORDER',
                        referenceId: String(savedOrder.id),
                        notes: `توريد طلبية للفرع رقم #${savedOrder.id}`,
                        performedBy: username,
                    });
                    await queryRunner.manager.save(movement);
                    queryRunner.manager
                        .findOne(product_entity_1.Product, { where: { id: item.productId } })
                        .then((p) => {
                        if (p?.sku) {
                            new website_sync_service_1.WebsiteSyncService().syncStock(p.sku, savedInv.currentQuantity, {
                                price: Number(p.websitePrice || p.retailPrice || 0),
                                wholesalePrice: Number(p.wholesalePrice || 0),
                            }).catch(() => { });
                        }
                    })
                        .catch(() => { });
                }
                const lastLedgerEntry = await queryRunner.manager.findOne(inventory_debt_ledger_entity_1.InventoryDebtLedger, {
                    where: { branchId },
                    order: { id: 'DESC' },
                    lock: { mode: 'pessimistic_write' },
                });
                const currentBalance = lastLedgerEntry
                    ? Number(lastLedgerEntry.balanceAfter)
                    : 0;
                let newBalance = currentBalance + chargeAmount;
                const chargeEntry = queryRunner.manager.create(inventory_debt_ledger_entity_1.InventoryDebtLedger, {
                    branchId,
                    transactionType: transaction_type_enum_1.TransactionType.CHARGE,
                    relatedOrderId: savedOrder.id,
                    amount: chargeAmount,
                    balanceAfter: newBalance,
                    description: `فاتورة بضائع #${savedOrder.id} | الإجمالي: ${Math.round(finalTotalAmount)}`,
                });
                await queryRunner.manager.save(chargeEntry);
                if (initialPaidAmount > 0) {
                    newBalance -= initialPaidAmount;
                    const paymentEntry = queryRunner.manager.create(inventory_debt_ledger_entity_1.InventoryDebtLedger, {
                        branchId,
                        transactionType: transaction_type_enum_1.TransactionType.PAYMENT,
                        relatedOrderId: savedOrder.id,
                        amount: initialPaidAmount,
                        balanceAfter: newBalance,
                        description: `سداد دفعة مقدمة لفاتورة #${savedOrder.id}`,
                    });
                    await queryRunner.manager.save(paymentEntry);
                }
                await this.activityService.createAuditLog(username, 'إصدار فاتورة فروع', `أصدر فاتورة توريد بضائع رقم #${savedOrder.id} لـ ${targetName} بقيمة ${finalTotalAmount} ج.م`);
                await this.activityService.createNotification({
                    branchId,
                    message: `تم إصدار فاتورة توريد جديدة لفرعكم رقم #${savedOrder.id} بقيمة ${finalTotalAmount} ج.م ومستحقة الدفع`,
                    type: 'WARNING',
                });
            }
            await queryRunner.commitTransaction();
            return this.findOne(savedOrder.id);
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(purchase_order_entity_1.PurchaseOrder)),
    __param(1, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource,
        activity_service_1.ActivityService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map