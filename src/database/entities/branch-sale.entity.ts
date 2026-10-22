import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Branch } from './branch.entity';
import { BranchSaleItem } from './branch-sale-item.entity';
import { Customer } from './customer.entity';

@Entity('branch_sales')
export class BranchSale {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  branchId: number;

  @ManyToOne(() => Branch, (branch) => branch.id, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  netAmount: number;

  @Column({ type: 'varchar', default: 'CASH' })
  paymentMethod: string;

  @Column({ type: 'varchar', default: 'RETAIL' })
  saleType: string; // 'RETAIL' | 'WHOLESALE' | 'WEBSITE'

  @Column({ type: 'varchar', default: 'COMPLETED' })
  status: string;

  @Column({ nullable: true })
  customerName: string;

  @Column({ type: 'int', nullable: true })
  customerId?: number;

  @ManyToOne(() => Customer, (customer) => customer.sales, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'customerId' })
  customer?: Customer;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  paidAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  remainingAmount: number;

  @OneToMany(() => BranchSaleItem, (item) => item.sale, { cascade: true })
  items: BranchSaleItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

