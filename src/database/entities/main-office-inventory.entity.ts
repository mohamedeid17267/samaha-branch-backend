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
import { Product } from './product.entity';
import { ImportContainer } from './import-container.entity';

@Entity('main_office_inventories')
@Unique(['productId', 'containerId'])
export class MainOfficeInventory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  productId: number;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column()
  containerId: number;

  @ManyToOne(() => ImportContainer, (container) => container.inventories, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'containerId' })
  container: ImportContainer;

  @Column({ type: 'int', default: 0 })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  costPrice: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
