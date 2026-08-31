import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('audit_events')
export class AuditEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  timestamp: Date;

  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  role: string;

  @Column({ nullable: true })
  facilityId: string;

  @Column()
  action: string;

  @Column({ nullable: true })
  resourceType: string;

  @Column({ nullable: true })
  resourceId: string;

  @Column({ nullable: true })
  requestId: string;

  @Column({ nullable: true })
  result: string;

  @Column({ nullable: true })
  reason: string;
}
