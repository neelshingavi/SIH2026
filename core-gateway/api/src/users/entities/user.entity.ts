import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum Role {
  ASHA = 'ASHA',
  ANM = 'ANM',
  CHO = 'CHO',
  MEDICAL_OFFICER = 'MEDICAL_OFFICER',
  SPECIALIST = 'SPECIALIST',
  FACILITY_ADMIN = 'FACILITY_ADMIN',
  DISTRICT_OFFICER = 'DISTRICT_OFFICER',
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column()
  passwordHash: string;

  @Column({ type: 'enum', enum: Role, default: Role.ASHA })
  role: Role;

  @Column()
  facilityId: string; // The canonical ID of the facility this user belongs to

  @Column({ nullable: true })
  practitionerId: string; // Link to canonical FHIR Practitioner resource

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
