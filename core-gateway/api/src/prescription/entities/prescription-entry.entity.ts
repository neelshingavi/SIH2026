import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('prescription_entries')
export class PrescriptionEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  facilityId: string;

  @Column()
  patientId: string;

  @Column()
  patientName: string;

  @Column()
  medicineName: string;

  @Column()
  dose: string;

  @Column()
  frequency: string;

  @Column()
  duration: string;

  @Column({ nullable: true })
  advice: string;

  @Column({ default: 'PRESCRIBED' })
  status: string; // PRESCRIBED, DISPENSED

  @CreateDateColumn()
  createdAt: Date;
}
