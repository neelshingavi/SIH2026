import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('referrals')
export class Referral {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  patientName: string;

  @Column({ default: '' })
  age: string;

  @Column({ default: 'M' })
  gender: string;

  @Column()
  fromFacilityId: string;

  @Column()
  toFacilityId: string;

  @Column()
  reason: string;

  @Column({ default: '' })
  notes: string;

  @Column({ default: 'NORMAL' })
  priority: string; // EMERGENCY | HIGH | NORMAL

  @Column({ default: 'CREATED' })
  status: string; // CREATED -> ACCEPTED -> IN_TRANSIT -> ARRIVED -> COMPLETED

  @CreateDateColumn()
  createdAt: Date;
}
