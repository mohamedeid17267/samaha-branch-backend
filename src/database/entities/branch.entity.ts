import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { BranchInventory } from './branch-inventory.entity';
import { PurchaseOrder } from './purchase-order.entity';
import { BrandRoyaltyLedger } from './brand-royalty-ledger.entity';
import { InventoryDebtLedger } from './inventory-debt-ledger.entity';
import { BranchExpense } from './branch-expense.entity';
import { BranchDailyRevenue } from './branch-daily-revenue.entity';

@Entity('branches')
export class Branch {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  location: string;

  @Column({ default: 'ACTIVE' })
  status: string; // 'ACTIVE', 'INACTIVE'

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  monthlyRoyalty: number;

  @Column({ type: 'int', default: 5 })
  royaltyDueDay: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => User, (user) => user.branch)
  users: User[];

  @OneToMany(() => BranchInventory, (inventory) => inventory.branch)
  inventories: BranchInventory[];

  @OneToMany(() => PurchaseOrder, (order) => order.branch)
  purchaseOrders: PurchaseOrder[];

  @OneToMany(() => BrandRoyaltyLedger, (ledger) => ledger.branch)
  royaltyLedgers: BrandRoyaltyLedger[];

  @OneToMany(() => InventoryDebtLedger, (ledger) => ledger.branch)
  debtLedgers: InventoryDebtLedger[];

  @OneToMany(() => BranchExpense, (expense) => expense.branch)
  expenses: BranchExpense[];

  @OneToMany(() => BranchDailyRevenue, (revenue) => revenue.branch)
  dailyRevenues: BranchDailyRevenue[];
}
