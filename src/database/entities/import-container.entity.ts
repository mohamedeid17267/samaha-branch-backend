import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { MainOfficeInventory } from './main-office-inventory.entity';
import { MainOfficeTransaction } from './main-office-transaction.entity';

@Entity('import_containers')
export class ImportContainer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  containerNumber: string;

  @Column({ type: 'date', nullable: true })
  arrivalDate: string;

  @Column({ default: 'OPEN' })
  status: string; // 'OPEN', 'CLOSED'

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => MainOfficeInventory, (inv) => inv.container)
  inventories: MainOfficeInventory[];

  @OneToMany(() => MainOfficeTransaction, (tx) => tx.container)
  transactions: MainOfficeTransaction[];
}
