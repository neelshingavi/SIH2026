import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('queue_entries')
export class QueueEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  facilityId: string;

  @Column()
  patientName: string;

  @Column()
  age: string;

  @Column()
  gender: string;

  @Column()
  chiefComplaint: string;

  @Column()
  priority: string;

  @Column({ default: 0 })
  token: number;

  @Column()
  status: string;

  @Column({ default: '' })
  bpVital: string;

  @Column({ default: '' })
  spo2Vital: string;

  @Column({ default: '' })
  tempVital: string;

  @Column({ default: '' })
  weight: string;

  @Column({ default: '' })
  hb: string;

  @Column({ default: '' })
  previousCheckup: string;

  @Column({ default: '' })
  healthStatus: string;

  @CreateDateColumn()
  createdAt: Date;
}
