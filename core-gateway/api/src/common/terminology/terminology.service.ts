import { Injectable, Logger } from '@nestjs/common';

export interface CodeMapping {
  system: string;
  code: string;
  display: {
    en: string;
    hi?: string;
    mr?: string;
  };
}

@Injectable()
export class TerminologyService {
  private readonly logger = new Logger(TerminologyService.name);

  // Phase 50-52: Terminology Boundary and Localization
  private readonly concepts: Map<string, CodeMapping> = new Map([
    ['O11', { system: 'http://hl7.org/fhir/sid/icd-10', code: 'O11', display: { en: 'Pre-existing hypertension with pre-eclampsia', hi: 'पूर्व-मौजूदा उच्च रक्तचाप के साथ प्री-एक्लेमप्सिया' } }],
    ['O14', { system: 'http://hl7.org/fhir/sid/icd-10', code: 'O14', display: { en: 'Gestational hypertension', hi: 'गर्भकालीन उच्च रक्तचाप' } }],
    ['D64.9', { system: 'http://hl7.org/fhir/sid/icd-10', code: 'D64.9', display: { en: 'Anemia, unspecified', hi: 'एनीमिया, अनिर्दिष्ट' } }],
    ['EMERGENCY', { system: 'http://terminology.hl7.org/CodeSystem/v3-ActPriority', code: 'EM', display: { en: 'Emergency', hi: 'आपातकाल' } }],
  ]);

  validateCode(system: string, code: string): boolean {
    const concept = this.concepts.get(code);
    if (concept && concept.system === system) return true;
    return false;
  }

  getDisplay(code: string, language: 'en' | 'hi' | 'mr' = 'en'): string {
    const concept = this.concepts.get(code);
    if (!concept) return code;
    
    return concept.display[language] || concept.display['en'];
  }
}
