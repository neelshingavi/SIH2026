import { Injectable, Logger } from '@nestjs/common';
import * as jsonLogic from 'json-logic-js';
import { EvaluateDto } from './triage.controller.js';

@Injectable()
export class TriageService {
  private readonly logger = new Logger(TriageService.name);

  // Define baseline rules per Section 5.3
  private rules = [
    {
      "id": "rule-general-spo2",
      "appliesTo": "General",
      "condition": { "<": [{ "var": "spo2" }, 90] },
      "outcome": {
        "riskBand": "EMERGENCY",
        "flag": "Hypoxia (SpO2 < 90%)",
        "recommendedAction": "IMMEDIATE_ESCALATION"
      }
    },
    {
      "id": "rule-anc-bp",
      "appliesTo": "ANC",
      "condition": {
        "or": [
          { ">=": [{ "var": "bp.systolic" }, 140] },
          { ">=": [{ "var": "bp.diastolic" }, 90] }
        ]
      },
      "outcome": {
        "riskBand": "HIGH_RISK",
        "flag": "Suspected pre-eclampsia",
        "recommendedAction": "PHC_CONSULT_WITHIN_24H"
      }
    }
  ];

  evaluate(dto: EvaluateDto) {
    this.logger.log(`Evaluating triage for patient ${dto.patientId}`);
    
    // Convert observations array to a simple key-value map for jsonLogic
    const variables = dto.observations.reduce((acc, curr) => {
      acc[curr.code] = curr.value;
      return acc;
    }, {});

    let finalRiskBand = 'NORMAL';
    const flags = [];
    let recommendedAction = 'ROUTINE_CARE';
    const ruleTrace = [];

    for (const rule of this.rules) {
      if (rule.appliesTo === dto.encounterType || rule.appliesTo === 'General') {
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

    return {
      riskBand: finalRiskBand,
      flags,
      recommendedAction,
      ruleTrace
    };
  }
}
