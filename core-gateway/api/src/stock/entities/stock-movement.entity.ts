import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('stock_movements')
export class StockMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  itemId: string; // References StockItem.id

  @Column()
  type: string; // 'IN' or 'OUT'

  @Column({ type: 'int' })
  quantity: number;

  @CreateDateColumn()
  timestamp: Date;
}
