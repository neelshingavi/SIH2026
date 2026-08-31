import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('fhir_resources')
export class FhirResource {
  @PrimaryColumn('uuid')
  id: string;

  @Column()
  resourceType: string;

  @Column('text')
  jsonPayload: string;

  @Column({ default: 1 })
  versionId: number;

  @Column({ default: false })
  isDeleted: boolean;

  @Column()
  createdBy: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
