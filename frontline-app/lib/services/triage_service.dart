import '../models/fhir_models.dart';

class TriageRule {
  final String id;
  final String appliesTo;
  final String riskBand;
  final String flag;
  final String recommendedAction;
  final bool Function(Map<String, double> vars) evaluate;

  TriageRule({
    required this.id,
    required this.appliesTo,
    required this.riskBand,
    required this.flag,
    required this.recommendedAction,
    required this.evaluate,
  });
}

class TriageResult {
  final String riskBand;
  final List<String> flags;
  final String recommendedAction;
  final String protocolVersion;

  TriageResult({
    required this.riskBand,
    required this.flags,
    required this.recommendedAction,
    required this.protocolVersion,
  });
}

class TriageService {
  final String _currentProtocolVersion = 'v1.1.0';
  
  final List<TriageRule> _rules = [
    TriageRule(
      id: 'rule-general-spo2',
      appliesTo: 'General',
      riskBand: 'EMERGENCY',
      flag: 'Severe Hypoxia (SpO2 < 90%)',
      recommendedAction: 'IMMEDIATE_ESCALATION',
      evaluate: (vars) => vars.containsKey('spo2') && vars['spo2']! < 90,
    ),
    TriageRule(
      id: 'rule-anc-bp',
      appliesTo: 'ANC',
      riskBand: 'EMERGENCY',
      flag: 'Severe Hypertension / Suspected Pre-eclampsia',
      recommendedAction: 'IMMEDIATE_ESCALATION',
      evaluate: (vars) => (vars.containsKey('bp.systolic') && vars['bp.systolic']! >= 160) || 
                          (vars.containsKey('bp.diastolic') && vars['bp.diastolic']! >= 110),
    ),
    TriageRule(
      id: 'rule-anc-bp-high',
      appliesTo: 'ANC',
      riskBand: 'HIGH_RISK',
      flag: 'Gestational Hypertension',
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
    String recommendedAction = 'ROUTINE_CARE';

    for (var rule in _rules) {
      if (rule.appliesTo == encounterType || rule.appliesTo == 'General') {
        if (rule.evaluate(variables)) {
          flags.add(rule.flag);
          
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
      recommendedAction: recommendedAction,
      protocolVersion: _currentProtocolVersion,
    );
  }
}
