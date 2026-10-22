import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Branch } from './branch.entity';
import { Product } from './product.entity';

@Entity('branch_inventories')
@Unique(['branchId', 'productId'])
export class BranchInventory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  branchId: number;

  @ManyToOne(() => Branch, (branch) => branch.inventories, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @Column()
  productId: number;

  @ManyToOne(() => Product, (product) => product.branchInventories, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'int', default: 0 })
  currentQuantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  sellingPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  retailPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  wholesalePrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  websitePrice: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
