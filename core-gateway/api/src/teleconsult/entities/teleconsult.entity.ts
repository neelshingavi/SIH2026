import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('teleconsults')
export class Teleconsult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  hubFacilityId: string; // The PHC/Doctor facility (e.g. PHC-001)

  @Column()
  spokeFacilityId: string; // The Sub-Centre calling in (e.g. SC-Wagholi)

  @Column()
  patientName: string;

  @Column({ default: '' })
  condition: string;

  @Column()
  priority: string; // 'high' | 'routine'

  @Column({ default: 'WAITING' })
  status: string; // WAITING -> ACTIVE -> COMPLETED

  @CreateDateColumn()
  createdAt: Date;
}
