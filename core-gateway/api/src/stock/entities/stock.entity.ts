import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('stock_items')
export class StockItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  facilityId: string;

  @Column()
  drugName: string;

  @Column()
  unit: string;

  @Column({ type: 'int', default: 0 })
  currentQty: number;
}
