import { MainOfficeInventory } from './main-office-inventory.entity';
import { MainOfficeTransaction } from './main-office-transaction.entity';
export declare class ImportContainer {
    id: number;
    containerNumber: string;
    arrivalDate: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    inventories: MainOfficeInventory[];
    transactions: MainOfficeTransaction[];
}
