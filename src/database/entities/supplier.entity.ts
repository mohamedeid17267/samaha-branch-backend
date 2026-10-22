import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { SupplierDebtLedger } from './supplier-debt-ledger.entity';

@Entity('suppliers')
export class Supplier {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  branchId?: number;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  supplierCode?: string;

  @Column({ type: 'varchar', nullable: true })
  phone?: string;

  @Column({ type: 'varchar', nullable: true })
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

  @OneToMany(() => SupplierDebtLedger, (ledger) => ledger.supplier)
  debtLedgers: SupplierDebtLedger[];
}
