import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('diagnostic_orders')
export class DiagnosticOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  patientName: string;

  @Column()
  patientId: string;

  @Column()
  testCode: string;

  @Column()
  testName: string;

  @Column({ default: 'PENDING' })
  status: string;

  @Column({ type: 'float', nullable: true })
  resultValue: number;

  @Column({ nullable: true })
  resultUnit: string;

  @CreateDateColumn()
  orderedAt: Date;
}
