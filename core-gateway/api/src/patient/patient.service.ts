import { Injectable, Logger } from '@nestjs/common';
import { FhirService } from '../fhir/fhir.service.js';
import { AuditService } from '../audit/audit.service.js';
import { QueueService } from '../queue/queue.service.js';

@Injectable()
export class PatientService {
  private readonly logger = new Logger(PatientService.name);

  constructor(
    private readonly fhirService: FhirService,
    private readonly auditService: AuditService,
    private readonly queueService: QueueService,
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
    } catch (e: any) {
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

    // Return mocked data instead of HAPI FHIR
    return {
      patient: {
        id: patientId,
        name: 'Arjun Kamble',
        age: '58',
        gender: 'Male',
        bloodGroup: 'O+',
        abhaId: '91-1234-5678-9012'
      },
      encounters: [
        { date: '2026-08-15', facility: 'PHC Dharampur', diagnosis: 'Hypertension', doctor: 'Dr. Neha Desai' },
        { date: '2026-07-10', facility: 'SC Wagholi', diagnosis: 'Routine Checkup', doctor: 'ANM Anita' }
      ],
      allergies: ['Penicillin'],
      chronicConditions: ['Type 2 Diabetes', 'Hypertension']
    };
  }

  async registerPatient(dto: any, user: any, requestId: string) {
    this.logger.log(`[${requestId}] Registering new patient: ${dto.name}`);
    
    // In a real system, we would map the DTO to a FHIR Patient resource and POST to FhirService.
    const newPatient = {
      id: `pat-${Date.now()}`,
      ...dto,
      registeredBy: user.userId,
      facilityId: user.facilityId,
      registrationDate: new Date().toISOString()
    };

    await this.auditService.logEvent({
      userId: user.userId,
      role: user.role,
      facilityId: user.facilityId,
      action: 'PATIENT_REGISTERED',
      resourceType: 'Patient',
      resourceId: newPatient.id,
      requestId: requestId,
      result: 'SUCCESS',
    });

    // Automatically create a queue entry for PHC triage
    const patientName = dto.fullName || dto.name || 'Unknown Patient';
    const facilityId = user?.facilityId || dto.facilityId || 'PHC-001';
    
    // Construct chief complaint. Include ASHA notes if present.
    let complaint = dto.healthStatus || '';
    if (!complaint) {
      complaint = dto.village ? `ASHA Sync (Village: ${dto.village})` : 'Synced from ASHA Field App';
    }

    await this.queueService.createEntry({
      facilityId: facilityId,
      patientName: patientName,
      age: dto.age ? String(dto.age) : '35',
      gender: dto.gender || 'Female',
      chiefComplaint: complaint,
      priority: 'NORMAL',
      weight: dto.weight,
      hb: dto.hb,
      bpVital: dto.bp,
      spo2Vital: dto.oxygen,
      tempVital: dto.temperature,
      previousCheckup: dto.previousCheckup,
      healthStatus: dto.healthStatus,
    });

    return {
      message: 'Patient registered successfully',
      patient: newPatient
    };
  }
}
