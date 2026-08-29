import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('queue_entries')
export class QueueEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  facilityId: string;

  @Column()
  patientName: string;

  @Column({ default: '' })
  age: string;

  @Column({ default: 'M' })
  gender: string;

  @Column({ default: '' })
  chiefComplaint: string;

  @Column({ default: '' })
  bpVital: string;

  @Column({ default: '' })
  spo2Vital: string;

  @Column({ default: '' })
  tempVital: string;

  @Column()
  priority: string; // 'NORMAL', 'HIGH', 'EMERGENCY'

  @Column({ default: 'WAITING' })
  status: string; // 'WAITING', 'CALLED', 'IN_CONSULT', 'DONE'

  @Column({ default: 0 })
  token: number;

  @CreateDateColumn()
  createdAt: Date;
}
