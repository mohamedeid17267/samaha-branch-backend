import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Product } from './product.entity';
import { Branch } from './branch.entity';

export enum StockMovementType {
  IN_SUPPLY = 'IN_SUPPLY',       // توريد مخزون / بضاعة
  OUT_SALE = 'OUT_SALE',         // بيع عبر نقطة البيع
  WASTE = 'WASTE',               // تالف / هالك
  ADJUSTMENT = 'ADJUSTMENT',     // تسوية جردية / تعديل
  RETURN = 'RETURN',             // مرتجع
  INITIAL = 'INITIAL',           // رصيد افتتاحي
}

@Entity('stock_movements')
export class StockMovement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  productId: number;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'int', nullable: true })
  branchId?: number;

  @ManyToOne(() => Branch, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'branchId' })
  branch?: Branch;

  @Column({
    type: 'enum',
    enum: StockMovementType,
    default: StockMovementType.IN_SUPPLY,
  })
  type: StockMovementType;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'int', default: 0 })
  balanceBefore: number;

  @Column({ type: 'int', default: 0 })
  balanceAfter: number;

  @Column({ type: 'varchar', nullable: true })
  referenceType?: string;

  @Column({ type: 'varchar', nullable: true })
  referenceId?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'varchar', nullable: true })
  performedBy?: string;

  @CreateDateColumn()
  createdAt: Date;
}
