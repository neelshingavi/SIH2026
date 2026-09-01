import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export type ReferralStatus   = 'CREATED' | 'ACCEPTED' | 'IN_TRANSIT' | 'ARRIVED' | 'COMPLETED';
export type ReferralPriority = 'EMERGENCY' | 'HIGH' | 'NORMAL';

@Entity('referral_entries')
export class ReferralEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  facilityId: string; // receiving facility

  @Column({ nullable: true })
  fromFacilityId: string; // sending sub-centre / PHC

  @Column()
  patientName: string;

  @Column({ nullable: true })
  age: string;

  @Column({ nullable: true })
  gender: string;

  @Column({ nullable: true })
  reason: string;

  @Column({ nullable: true })
  notes: string;

  @Column({ type: 'varchar', default: 'NORMAL' })
  priority: ReferralPriority;

  @Column({ type: 'varchar', default: 'CREATED' })
  status: ReferralStatus;

  @CreateDateColumn()
  createdAt: Date;
}
