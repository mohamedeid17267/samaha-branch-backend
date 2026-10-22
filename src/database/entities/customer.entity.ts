import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { CustomerDebtLedger } from './customer-debt-ledger.entity';
import { PurchaseOrder } from './purchase-order.entity';
import { BranchSale } from './branch-sale.entity';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  branchId?: number;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  customerCode?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  totalInvoiced: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  totalPaid: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  currentDebt: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => CustomerDebtLedger, (ledger) => ledger.customer)
  debtLedgers: CustomerDebtLedger[];

  @OneToMany(() => PurchaseOrder, (order) => order.customer)
  purchaseOrders: PurchaseOrder[];

  @OneToMany(() => BranchSale, (sale) => sale.customer)
  sales: BranchSale[];
}

