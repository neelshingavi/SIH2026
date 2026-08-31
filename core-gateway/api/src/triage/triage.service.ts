import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as jsonLogic from 'json-logic-js';
import { FhirService } from '../fhir/fhir.service.js';
import { AuditService } from '../audit/audit.service.js';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TriageService {
  private readonly logger = new Logger(TriageService.name);

  // Versioned Protocol Rules
  private readonly RULE_VERSION = 'v1.1.0';
  private rules = [
    {
      "id": "rule-general-spo2",
      "appliesTo": "General",
      "condition": { "<": [{ "var": "spo2" }, 90] },
      "outcome": {
        "riskBand": "EMERGENCY",
        "flag": "Severe Hypoxia (SpO2 < 90%)",
        "recommendedAction": "IMMEDIATE_ESCALATION"
      }
    },
    {
      "id": "rule-anc-bp",
      "appliesTo": "ANC",
      "condition": {
        "or": [
          { ">=": [{ "var": "bp.systolic" }, 160] },
          { ">=": [{ "var": "bp.diastolic" }, 110] }
        ]
      },
      "outcome": {
        "riskBand": "EMERGENCY",
        "flag": "Severe Hypertension / Suspected Pre-eclampsia",
        "recommendedAction": "IMMEDIATE_ESCALATION"
      }
    },
    {
      "id": "rule-anc-bp-high",
      "appliesTo": "ANC",
      "condition": {
        "or": [
          { ">=": [{ "var": "bp.systolic" }, 140] },
          { ">=": [{ "var": "bp.diastolic" }, 90] }
        ]
      },
      "outcome": {
        "riskBand": "HIGH_RISK",
        "flag": "Gestational Hypertension",
        "recommendedAction": "PHC_CONSULT_WITHIN_24H"
      }
    }
  ];

  constructor(
    private readonly fhirService: FhirService,
    private readonly auditService: AuditService
  ) {}

  async evaluateEncounter(encounterId: string, user: any, correlationId: string) {
    this.logger.log(`Evaluating triage for encounter \${encounterId}`);
    
    const encounter = await this.fhirService.getResource('Encounter', encounterId);
    if (!encounter) throw new NotFoundException('Encounter not found');
    
    const patientRef = encounter.subject?.reference;
    if (!patientRef) throw new NotFoundException('Encounter has no subject');
    const patientId = patientRef.split('/')[1];

    // Fetch Observations linked to this encounter
    const obsBundle = await this.fhirService.getResource('Observation', `?encounter=Encounter/\${encounterId}`);
    const observations = obsBundle?.entry?.map(e => e.resource) || [];

    // Extract values
    const variables: Record<string, number> = {};
    for (const obs of observations) {
      if (obs.resourceType === 'Observation' && obs.code?.coding?.[0]?.code) {
        const code = obs.code.coding[0].code;
        if (obs.valueQuantity?.value !== undefined) {
          variables[code] = obs.valueQuantity.value;
        }
      }
    }

    let finalRiskBand = 'ROUTINE';
    const flags = [];
    let recommendedAction = 'ROUTINE_CARE';
    const ruleTrace = [];

    // Evaluate
    // For demo, if class is ANC, we use ANC rules. Otherwise General.
    const encounterType = encounter.class?.code === 'ANC' ? 'ANC' : 'General';

    for (const rule of this.rules) {
      if (rule.appliesTo === encounterType || rule.appliesTo === 'General') {
        const isMatch = jsonLogic.apply((rule as any).condition, variables);
        if (isMatch) {
          ruleTrace.push(rule.id);
          flags.push(rule.outcome.flag);
          
          if (rule.outcome.riskBand === 'EMERGENCY') {
            finalRiskBand = 'EMERGENCY';
            recommendedAction = rule.outcome.recommendedAction;
          } else if (rule.outcome.riskBand === 'HIGH_RISK' && finalRiskBand !== 'EMERGENCY') {
            finalRiskBand = 'HIGH_RISK';
            recommendedAction = rule.outcome.recommendedAction;
          }
        }
      }
    }

    // Generate FHIR RiskAssessment
    const riskId = uuidv4();
    const riskAssessment = {
      resourceType: 'RiskAssessment',
      id: riskId,
      status: 'final',
      subject: { reference: `Patient/\${patientId}` },
      encounter: { reference: `Encounter/\${encounterId}` },
      method: { coding: [{ system: 'http://setu.in/protocols', code: this.RULE_VERSION }] },
      prediction: [{
        qualitativeRisk: { text: finalRiskBand },
        rationale: flags.join('; ') || 'No elevated risk indicators detected.'
      }],
      mitigation: recommendedAction
    };

    await this.fhirService.createOrUpdate('RiskAssessment', riskId, riskAssessment, undefined, 'CREATE');

    await this.auditService.logEvent({
      userId: user.userId,
      role: user.role,
      facilityId: user.facilityId,
      action: 'TRIAGE_COMPLETED',
      resourceType: 'RiskAssessment',
      resourceId: riskId,
      requestId: correlationId,
      result: 'SUCCESS',
    });

    if (finalRiskBand === 'EMERGENCY' || finalRiskBand === 'HIGH_RISK') {
      await this.auditService.logEvent({
        userId: user.userId,
        role: user.role,
        facilityId: user.facilityId,
        action: 'RISK_IDENTIFIED',
        resourceType: 'RiskAssessment',
        resourceId: riskId,
        requestId: correlationId,
        result: 'SUCCESS',
      });
    }

    return riskAssessment;
  }
}
