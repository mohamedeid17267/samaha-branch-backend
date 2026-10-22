import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Product } from './product.entity';
import { ImportContainer } from './import-container.entity';

@Entity('main_office_transactions')
export class MainOfficeTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  productId: number;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column()
  containerId: number;

  @ManyToOne(() => ImportContainer, (container) => container.transactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'containerId' })
  container: ImportContainer;

  @Column()
  type: string; // 'RECEIVE', 'WITHDRAW', 'AUDIT'

  @Column({ type: 'int' })
  quantity: number; // The amount changed

  @Column({ type: 'int' })
  balanceAfter: number; // Balance after the change

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;
}
