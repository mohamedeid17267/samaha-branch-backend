import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Customer } from '../../database/entities/customer.entity';
import { CustomerDebtLedger } from '../../database/entities/customer-debt-ledger.entity';
import { BranchInventory } from '../../database/entities/branch-inventory.entity';
import { StockMovement } from '../../database/entities/stock-movement.entity';
import { TransactionType } from '../enums/transaction-type.enum';

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(private dataSource: DataSource) {}

  /**
   * Authoritative server-side recalculation of customer balance from ledger
   */
  async reconcileCustomerBalance(customerId: number): Promise<{
    totalInvoiced: number;
    totalPaid: number;
    currentDebt: number;
  }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await queryRunner.manager
        .createQueryBuilder(CustomerDebtLedger, 'ledger')
        .select([
          `SUM(CASE WHEN ledger.transactionType = '${TransactionType.CHARGE}' THEN ledger.amount ELSE 0 END) as invoiced`,
          `SUM(CASE WHEN ledger.transactionType = '${TransactionType.PAYMENT}' THEN ledger.paidAmount ELSE 0 END) as paid`,
        ])
        .where('ledger.customerId = :customerId', { customerId })
        .getRawOne();

      const totalInvoiced = Math.round((Number(result?.invoiced) || 0) * 100) / 100;
      const totalPaid = Math.round((Number(result?.paid) || 0) * 100) / 100;
      const currentDebt = Math.round((totalInvoiced - totalPaid) * 100) / 100;

      await queryRunner.manager.update(Customer, customerId, {
        totalInvoiced,
        totalPaid,
        currentDebt,
      });

      await queryRunner.commitTransaction();
      this.logger.log(
        `[Reconciled Customer ${customerId}] Invoiced: ${totalInvoiced}, Paid: ${totalPaid}, Debt: ${currentDebt}`,
      );

      return { totalInvoiced, totalPaid, currentDebt };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Recalculates branch stock from movements and flags discrepancies
   */
  async reconcileStockMovements(productId: number, branchId: number): Promise<{
    derivedStock: number;
    isNegative: boolean;
  }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await queryRunner.manager
        .createQueryBuilder(StockMovement, 'sm')
        .select('SUM(sm.quantity)', 'totalQuantity')
        .where('sm.productId = :productId AND sm.branchId = :branchId', { productId, branchId })
        .getRawOne();

      const derivedStock = Number(result?.totalQuantity) || 0;
      const isNegative = derivedStock < 0;

      await queryRunner.manager.update(
        BranchInventory,
        { productId, branchId },
        { currentQuantity: derivedStock },
      );

      if (isNegative) {
        this.logger.warn(
          `[Inventory Discrepancy Alert] Product ${productId} at Branch ${branchId} has negative derived stock (${derivedStock})`,
        );
      }

      await queryRunner.commitTransaction();
      return { derivedStock, isNegative };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
