import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('branch_synced_reports')
@Index(['branchCode', 'reportDate'], { unique: true })
export class BranchSyncedReport {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 64 })
  @Index()
  branchCode: string; // e.g. 'samaha-branch'

  @Column({ length: 128 })
  branchName: string; // e.g. 'فرع سموحة'

  @Column({ type: 'date' })
  @Index()
  reportDate: string; // YYYY-MM-DD

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0.0 })
  totalSales: number;

  @Column({ type: 'int', default: 0 })
  totalOrders: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0.0 })
  cashSales: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0.0 })
  visaSales: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0.0 })
  totalExpenses: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0.0 })
  netProfit: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0.0 })
  currentStockValue: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'json', nullable: true })
  rawDetails: any; // Optional extra breakdown (top products, category breakdown, cashiers)

  @Column({ default: 'SYNCED' })
  syncStatus: string; // 'SYNCED', 'PENDING_REVIEW'

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
