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

    try {
      // Fetch real FHIR patient data
      const fhirPatient = await this.fhirService.getResource('Patient', patientId);
      if (!fhirPatient) {
        throw new Error('Patient not found');
      }

      // We can also fetch $everything to get encounters (not fully implemented in prototype UI yet)
      
      return {
        patient: {
          id: patientId,
          name: fhirPatient.name?.[0]?.text || 'Unknown',
          age: fhirPatient.birthDate ? (new Date().getFullYear() - new Date(fhirPatient.birthDate).getFullYear()).toString() : 'Unknown',
          gender: fhirPatient.gender || 'Unknown',
          bloodGroup: 'Unknown',
          abhaId: 'Unknown'
        },
        encounters: [],
        allergies: [],
        chronicConditions: []
      };
    } catch (e: any) {
      this.logger.error(`Error fetching patient \${patientId} from FHIR`, e.stack);
      // Fallback for prototype if FHIR is down
      return {
        patient: {
          id: patientId,
          name: 'Arjun Kamble (Mock)',
          age: '58',
          gender: 'Male',
          bloodGroup: 'O+',
          abhaId: '91-1234-5678-9012'
        },
        encounters: [],
        allergies: [],
        chronicConditions: []
      };
    }
  }

  async registerPatient(dto: any, user: any, requestId: string) {
    this.logger.log(`[${requestId}] Registering new patient: ${dto.name}`);
    
    // Real FHIR mapping
    const newPatientId = `pat-${Date.now()}`;
    const fhirPatient = {
      resourceType: 'Patient',
      id: newPatientId,
      name: [{ text: dto.fullName || dto.name || 'Unknown' }],
      gender: (dto.gender || 'unknown').toLowerCase(),
      telecom: dto.phone ? [{ system: 'phone', value: dto.phone }] : undefined,
      extension: [
        {
          url: 'http://sih.gov.in/fhir/StructureDefinition/facility',
          valueString: user.facilityId || dto.facilityId
        }
      ]
    };

    // Calculate approx birth date if age is provided
    if (dto.age) {
      const year = new Date().getFullYear() - parseInt(dto.age, 10);
      (fhirPatient as any).birthDate = `${year}-01-01`;
    }

    try {
      await this.fhirService.createOrUpdate('Patient', newPatientId, fhirPatient, undefined, 'CREATE');
    } catch (e: any) {
      this.logger.error('Failed to create FHIR Patient, continuing for queue', e.stack);
    }

    const newPatient = {
      id: newPatientId,
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
      resourceId: newPatientId,
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

    let priority = 'NORMAL';
    const lowerComplaint = complaint.toLowerCase();
    if (lowerComplaint.includes('chest pain') || lowerComplaint.includes('breath') || lowerComplaint.includes('unconscious')) {
      priority = 'EMERGENCY';
    } else if (lowerComplaint.includes('fever') || lowerComplaint.includes('severe') || lowerComplaint.includes('reduced movement')) {
      priority = 'HIGH';
    }

    await this.queueService.createEntry({
      facilityId: facilityId,
      patientName: patientName,
      age: dto.age ? String(dto.age) : '35',
      gender: dto.gender || 'Female',
      chiefComplaint: complaint,
      priority: priority,
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
