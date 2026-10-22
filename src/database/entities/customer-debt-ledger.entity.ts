import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Customer } from './customer.entity';
import { PurchaseOrder } from './purchase-order.entity';
import { BranchSale } from './branch-sale.entity';
import { TransactionType } from '../../common/enums/transaction-type.enum';

@Entity('customer_debt_ledger')
export class CustomerDebtLedger {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  customerId: number;

  @ManyToOne(() => Customer, (customer) => customer.debtLedgers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @Column({ type: 'int', nullable: true })
  branchId?: number;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  transactionType: TransactionType;

  @Column({ type: 'varchar', nullable: true })
  invoiceNumber?: string;

  @Column({ nullable: true })
  relatedOrderId: number | null;

  @ManyToOne(() => PurchaseOrder, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'relatedOrderId' })
  relatedOrder: PurchaseOrder | null;

  @Column({ nullable: true })
  relatedSaleId: number | null;

  @ManyToOne(() => BranchSale, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'relatedSaleId' })
  relatedSale: BranchSale | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  paidAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  balanceAfter: number;

  @Column({ type: 'varchar', nullable: true })
  paymentMethod?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', nullable: true })
  invoiceDate?: string;

  @Column({ type: 'varchar', nullable: true })
  recordedBy?: string;

  @Column({ type: 'varchar', nullable: true })
  receiptUrl: string | null;

  @CreateDateColumn()
  createdAt: Date;
}

