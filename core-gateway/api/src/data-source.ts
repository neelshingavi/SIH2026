import { DataSource } from 'typeorm';
import { StockItem } from './stock/entities/stock.entity.js';
import { StockMovement } from './stock/entities/stock-movement.entity.js';
import { FhirResource } from './sync/entities/fhir-resource.entity.js';
import { SyncIdempotency } from './sync/entities/sync-idempotency.entity.js';
import { User } from './users/entities/user.entity.js';
import { AuditEvent } from './audit/entities/audit-event.entity.js';
import { QueueEntry } from './queue/entities/queue.entity.js';
import { DiagnosticOrder } from './diagnostics/entities/diagnostic.entity.js';
import { ReferralEntry } from './referral/entities/referral-entry.entity.js';
import { PrescriptionEntry } from './prescription/entities/prescription-entry.entity.js';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5433', 10),
  username: process.env.DB_USER || 'hapi',
  password: process.env.DB_PASSWORD || 'hapi_password',
  database: process.env.DB_NAME || 'hapi',
  synchronize: false,
  logging: true,
  entities: [StockItem, StockMovement, FhirResource, SyncIdempotency, User, AuditEvent, QueueEntry, DiagnosticOrder, ReferralEntry, PrescriptionEntry],
  subscribers: [],
  migrations: ['src/migrations/*.ts'],
});
