import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { BranchInventory } from './branch-inventory.entity';
import { OrderItem } from './order-item.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  sku: string;

  @Column({ nullable: true })
  supplierCode: string;

  @Column({ nullable: true })
  branchId: number;

  @Column()
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  costPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  standardDistributerPrice: number;

  @Column({ type: 'varchar', default: 'عام' })
  category: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  retailPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  wholesalePrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  websitePrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  dozenPrice: number;

  @Column({ type: 'json', nullable: true })
  images: string[];

  @Column({ type: 'int', default: 0 })
  globalStock: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => BranchInventory, (inventory) => inventory.product)
  branchInventories: BranchInventory[];

  @OneToMany(() => OrderItem, (item) => item.product)
  orderItems: OrderItem[];
}
