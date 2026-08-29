import '../models/fhir_models.dart';

class TriageResult {
  final String riskBand;
  final List<String> flags;
  final String recommendedAction;

  TriageResult({
    required this.riskBand,
    required this.flags,
    required this.recommendedAction,
  });
}

class TriageService {
  // Evaluates clinical vitals for High-Risk Pregnancies based on OpenSRP/DHIS2 models
  TriageResult evaluate(String encounterType, List<Observation> observations) {
    String finalRiskBand = 'NORMAL';
    List<String> flags = [];
    String recommendedAction = 'ROUTINE_CARE';

    double? bpSys;
    double? bpDia;
    double? hb;
    double? spo2;

    for (var obs in observations) {
      if (obs.code == 'bp.systolic') bpSys = (obs.value as num).toDouble();
      if (obs.code == 'bp.diastolic') bpDia = (obs.value as num).toDouble();
      if (obs.code == 'hemoglobin') hb = (obs.value as num).toDouble();
      if (obs.code == 'spo2') spo2 = (obs.value as num).toDouble();
    }

    // ANC (Antenatal Care) Triage Rules
    if (encounterType == 'ANC') {
      // 1. Severe Pre-eclampsia / Hypertension
      if ((bpSys != null && bpSys >= 160) || (bpDia != null && bpDia >= 110)) {
        finalRiskBand = 'EMERGENCY';
        flags.add('Severe Hypertension / Suspected Pre-eclampsia');
        recommendedAction = 'IMMEDIATE_ESCALATION';
      } else if ((bpSys != null && bpSys >= 140) || (bpDia != null && bpDia >= 90)) {
        if (finalRiskBand != 'EMERGENCY') finalRiskBand = 'HIGH_RISK';
        flags.add('Gestational Hypertension');
        if (recommendedAction != 'IMMEDIATE_ESCALATION') recommendedAction = 'PHC_CONSULT_WITHIN_24H';
      }

      // 2. Severe Anemia
      if (hb != null && hb < 7.0) {
        finalRiskBand = 'EMERGENCY';
        flags.add('Severe Anemia (Hb < 7)');
        recommendedAction = 'IMMEDIATE_ESCALATION';
      } else if (hb != null && hb < 11.0) {
        if (finalRiskBand != 'EMERGENCY') finalRiskBand = 'HIGH_RISK';
        flags.add('Moderate Anemia (Hb < 11)');
        if (recommendedAction != 'IMMEDIATE_ESCALATION') recommendedAction = 'PHC_CONSULT_WITHIN_24H';
      }
    }

    // General Hypoxia Rule
    if (spo2 != null && spo2 < 90) {
      finalRiskBand = 'EMERGENCY';
      flags.add('Severe Hypoxia (SpO2 < 90%)');
      recommendedAction = 'IMMEDIATE_ESCALATION';
    }

    return TriageResult(
      riskBand: finalRiskBand,
      flags: flags,
      recommendedAction: recommendedAction,
    );
  }
}
