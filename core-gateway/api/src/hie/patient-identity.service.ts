import { Injectable, Logger } from '@nestjs/common';
import { FhirService } from '../fhir/fhir.service.js';

export enum IdentityMatchResult {
  MATCH = 'MATCH',
  POSSIBLE_MATCH = 'POSSIBLE_MATCH',
  NO_MATCH = 'NO_MATCH',
  CONFLICT = 'CONFLICT'
}

@Injectable()
export class PatientIdentityService {
  private readonly logger = new Logger(PatientIdentityService.name);

  constructor(private readonly fhirService: FhirService) {}

  async resolveIdentity(externalPatient: any): Promise<{ result: IdentityMatchResult, localPatientId?: string }> {
    this.logger.log(`Resolving identity for external patient...`);

    // 1. Exact ABHA matching
    const abhaId = this.extractIdentifier(externalPatient, 'https://ndhm.gov.in/abha');
    if (abhaId) {
      const matches = await this.fhirService.searchResources('Patient', { identifier: abhaId });
      if (matches.length === 1) return { result: IdentityMatchResult.MATCH, localPatientId: matches[0].id };
      if (matches.length > 1) return { result: IdentityMatchResult.CONFLICT };
    }

    // 2. Exact local ID matching (if they happened to sync our UUID)
    if (externalPatient.id) {
        const localPat = await this.fhirService.getResource('Patient', externalPatient.id);
        if (localPat) return { result: IdentityMatchResult.MATCH, localPatientId: localPat.id };
    }

    // 3. Probabilistic matching (Name, DOB, Gender, Phone)
    const phone = this.extractTelecom(externalPatient, 'phone');
    const nameStr = this.extractName(externalPatient);
    
    // In a real FHIR backend, we'd use robust $match or fuzzy search.
    // For this prototype, we'll try to find by phone.
    if (phone) {
        const phoneMatches = await this.fhirService.searchResources('Patient', { telecom: phone });
        if (phoneMatches.length === 1) {
            const m = phoneMatches[0];
            // Verify demographics to see if it's a MATCH or POSSIBLE_MATCH
            const mName = this.extractName(m);
            if (mName.toLowerCase() === nameStr.toLowerCase() && m.birthDate === externalPatient.birthDate) {
                return { result: IdentityMatchResult.MATCH, localPatientId: m.id };
            }
            return { result: IdentityMatchResult.POSSIBLE_MATCH, localPatientId: m.id };
        }
    }

    // If nothing matched, it's a new patient we've never seen
    return { result: IdentityMatchResult.NO_MATCH };
  }

  private extractIdentifier(patient: any, system: string): string | null {
    if (!patient.identifier) return null;
    const id = patient.identifier.find((i: any) => i.system === system);
    return id ? id.value : null;
  }

  private extractTelecom(patient: any, system: string): string | null {
    if (!patient.telecom) return null;
    const t = patient.telecom.find((i: any) => i.system === system);
    return t ? t.value : null;
  }

  private extractName(patient: any): string {
    if (!patient.name || patient.name.length === 0) return '';
    const n = patient.name[0];
    return [n.given?.join(' '), n.family].filter(Boolean).join(' ');
  }
}
