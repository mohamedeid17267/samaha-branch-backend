import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Supplier } from './supplier.entity';
import { TransactionType } from '../../common/enums/transaction-type.enum';

@Entity('supplier_debt_ledger')
export class SupplierDebtLedger {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  supplierId: number;

  @ManyToOne(() => Supplier, (supplier) => supplier.debtLedgers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'supplierId' })
  supplier: Supplier;

  @Column({ type: 'int', nullable: true })
  branchId?: number;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  transactionType: TransactionType;

  @Column({ type: 'varchar', nullable: true })
  invoiceNumber?: string;

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

  @CreateDateColumn()
  createdAt: Date;
}
