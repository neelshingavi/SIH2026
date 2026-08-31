import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

@Entity('sync_idempotency')
export class SyncIdempotency {
  @PrimaryColumn('uuid')
  idempotencyKey: string;

  @Column('uuid')
  operationId: string;

  @Column('uuid')
  resourceId: string;

  @Column()
  status: string;

  @CreateDateColumn()
  appliedAt: Date;
}
