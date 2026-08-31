import { Injectable, Logger } from '@nestjs/common';
import { FhirService } from '../fhir/fhir.service.js';
import { AuditService } from '../audit/audit.service.js';

@Injectable()
export class PatientService {
  private readonly logger = new Logger(PatientService.name);

  constructor(
    private readonly fhirService: FhirService,
    private readonly auditService: AuditService,
  ) {}

  async checkDuplicate(patientDto: any, user: any, requestId: string) {
    this.logger.log(`[${requestId}] Checking for duplicate patient: ${patientDto.name}`);
    
    // In a real FHIR query, we would use search parameters. Here we simulate the logic.
    // Assuming FhirService has a search method or we just do a direct GET.
    // For this prototype, we'll hit the /Patient endpoint with search query parameters.
    let searchUrl = `Patient?`;
    if (patientDto.name) searchUrl += `name=${encodeURIComponent(patientDto.name)}&`;
    if (patientDto.phone) searchUrl += `telecom=${encodeURIComponent(patientDto.phone)}&`;
    if (patientDto.birthDate) searchUrl += `birthdate=${patientDto.birthDate}&`;

    try {
      const existingPatients = await this.fhirService.getResource('Patient', `?name=${patientDto.name}`);
      // Typically returns a Bundle
      const entryCount = existingPatients?.total || (existingPatients?.entry?.length || 0);

      await this.auditService.logEvent({
        userId: user.userId,
        role: user.role,
        facilityId: user.facilityId,
        action: 'PATIENT_DUPLICATE_CHECK',
        requestId: requestId,
        result: entryCount > 0 ? 'DUPLICATE_FOUND' : 'NO_DUPLICATE',
      });

      if (entryCount > 0) {
        return {
          status: 'POSSIBLE_DUPLICATE',
          matches: existingPatients.entry.map((e: any) => e.resource),
        };
      }
      return { status: 'NO_DUPLICATE' };
    } catch (e) {
      this.logger.error(`Error checking duplicates`, e.message);
      return { status: 'NO_DUPLICATE' }; // Fail open for the prototype if FHIR is down
    }
  }

  async getPatientHistory(patientId: string, user: any, requestId: string) {
    this.logger.log(`[${requestId}] Fetching longitudinal history for patient ${patientId}`);
    
    await this.auditService.logEvent({
      userId: user.userId,
      role: user.role,
      facilityId: user.facilityId,
      action: 'PATIENT_VIEWED',
      resourceType: 'Patient',
      resourceId: patientId,
      requestId: requestId,
      result: 'SUCCESS',
    });

    return this.fhirService.getPatientEverything(patientId);
  }
}
