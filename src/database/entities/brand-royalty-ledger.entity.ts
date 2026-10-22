import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Branch } from './branch.entity';
import { TransactionType } from '../../common/enums/transaction-type.enum';

@Entity('brand_royalty_ledger')
export class BrandRoyaltyLedger {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  branchId: number;

  @ManyToOne(() => Branch, (branch) => branch.royaltyLedgers, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  transactionType: TransactionType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  balanceAfter: number;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'varchar', nullable: true })
  receiptUrl: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
