import '../models/fhir_models.dart';

class TriageRule {
  final String id;
  final String version;
  final String appliesTo;
  final String riskBand;
  final String flag;
  final String rationale;
  final String source;
  final String effectiveDate;
  final String recommendedAction;
  final bool Function(Map<String, double> vars) evaluate;

  TriageRule({
    required this.id,
    required this.version,
    required this.appliesTo,
    required this.riskBand,
    required this.flag,
    required this.rationale,
    required this.source,
    required this.effectiveDate,
    required this.recommendedAction,
    required this.evaluate,
  });
}

class TriageResult {
  final String riskBand;
  final List<String> flags;
  final List<Map<String, String>> triggeredRules;
  final String recommendedAction;
  final String protocolVersion;

  TriageResult({
    required this.riskBand,
    required this.flags,
    required this.triggeredRules,
    required this.recommendedAction,
    required this.protocolVersion,
  });
}

class TriageService {
  final String _currentProtocolVersion = 'v1.1.0';
  
  final List<TriageRule> _rules = [
    TriageRule(
      id: 'rule-general-spo2',
      version: '1.0.0',
      appliesTo: 'General',
      riskBand: 'EMERGENCY',
      flag: 'Severe Hypoxia (SpO2 < 90%)',
      rationale: 'SpO2 below 90% indicates severe respiratory distress requiring immediate oxygen therapy.',
      source: 'WHO Clinical Management of COVID-19',
      effectiveDate: '2023-01-01',
      recommendedAction: 'IMMEDIATE_ESCALATION',
      evaluate: (vars) => vars.containsKey('spo2') && vars['spo2']! < 90,
    ),
    TriageRule(
      id: 'rule-anc-bp',
      version: '1.1.0',
      appliesTo: 'ANC',
      riskBand: 'EMERGENCY',
      flag: 'Severe Hypertension / Suspected Pre-eclampsia',
      rationale: 'Systolic >= 160 or Diastolic >= 110 in pregnancy is a hypertensive crisis.',
      source: 'ACOG Practice Bulletin No. 222',
      effectiveDate: '2023-06-01',
      recommendedAction: 'IMMEDIATE_ESCALATION',
      evaluate: (vars) => (vars.containsKey('bp.systolic') && vars['bp.systolic']! >= 160) || 
                          (vars.containsKey('bp.diastolic') && vars['bp.diastolic']! >= 110),
    ),
    TriageRule(
      id: 'rule-anc-bp-high',
      version: '1.0.1',
      appliesTo: 'ANC',
      riskBand: 'HIGH_RISK',
      flag: 'Gestational Hypertension',
      rationale: 'Systolic >= 140 or Diastolic >= 90 indicates gestational hypertension requiring monitoring.',
      source: 'ACOG Practice Bulletin No. 222',
      effectiveDate: '2023-01-01',
      recommendedAction: 'PHC_CONSULT_WITHIN_24H',
      evaluate: (vars) => (vars.containsKey('bp.systolic') && vars['bp.systolic']! >= 140) || 
                          (vars.containsKey('bp.diastolic') && vars['bp.diastolic']! >= 90),
    ),
  ];

  TriageResult evaluate(String encounterType, List<Observation> observations) {
    Map<String, double> variables = {};
    for (var obs in observations) {
      if (obs.code != null && obs.value != null) {
        variables[obs.code!] = (obs.value as num).toDouble();
      }
    }

    String finalRiskBand = 'ROUTINE';
    List<String> flags = [];
    List<Map<String, String>> triggeredRules = [];
    String recommendedAction = 'ROUTINE_CARE';

    for (var rule in _rules) {
      if (rule.appliesTo == encounterType || rule.appliesTo == 'General') {
        if (rule.evaluate(variables)) {
          flags.add(rule.flag);
          triggeredRules.add({
            'ruleId': rule.id,
            'version': rule.version,
            'rationale': rule.rationale,
            'source': rule.source,
          });
          
          if (rule.riskBand == 'EMERGENCY') {
            finalRiskBand = 'EMERGENCY';
            recommendedAction = rule.recommendedAction;
          } else if (rule.riskBand == 'HIGH_RISK' && finalRiskBand != 'EMERGENCY') {
            finalRiskBand = 'HIGH_RISK';
            recommendedAction = rule.recommendedAction;
          }
        }
      }
    }

    return TriageResult(
      riskBand: finalRiskBand,
      flags: flags,
      triggeredRules: triggeredRules,
      recommendedAction: recommendedAction,
      protocolVersion: _currentProtocolVersion,
    );
  }
}
