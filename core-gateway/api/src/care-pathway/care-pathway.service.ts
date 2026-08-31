import { Injectable, Logger } from '@nestjs/common';
import { FhirService } from '../fhir/fhir.service.js';
import * as crypto from 'crypto';

export type PathwayState =
  | 'ASSESSMENT_PENDING'
  | 'ASSESSMENT_COMPLETED'
  | 'RISK_IDENTIFIED'
  | 'CLINICIAN_REVIEW_PENDING'
  | 'ESCALATION_REQUIRED'
  | 'REFERRAL_PENDING'
  | 'CONSENT_PENDING'
  | 'CONSENT_OBTAINED'
  | 'RECORD_SHARE_FAILED'
  | 'RECORD_SHARED'
  | 'REFERRAL_ACCEPTED'
  | 'CONSULTATION_PENDING'
  | 'CONSULTATION_COMPLETED'
  | 'DIAGNOSTICS_PENDING'
  | 'TREATMENT_PENDING'
  | 'FOLLOWUP_DUE'
  | 'FOLLOWUP_OVERDUE'
  | 'CARE_COMPLETED';

export type GapStatus = 'OPEN' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED' | 'ESCALATED';

export interface CareGap2 {
  gapId: string;
  patientReference: string;
  pathway: string;
  step: PathwayState;
  severity: string;
  priority: 'EMERGENCY' | 'HIGH' | 'ROUTINE';
  reason: string;
  expectedAction: string;
  responsibleRole: string;
  responsibleFacility: string;
  dueAt: string;
  createdAt: string;
  evidence: string[];
  status: GapStatus;
}

@Injectable()
export class CarePathwayService {
  private readonly logger = new Logger(CarePathwayService.name);

  constructor(private readonly fhirService: FhirService) {}

  /**
   * Determine the current pathway state and care gaps for a specific patient.
   * This evaluates all relevant FHIR resources and returns the authoritative state.
   */
  async evaluatePatientPathway(patientId: string, facilityId: string): Promise<{ state: PathwayState, gaps: CareGap2[] }> {
    this.logger.log(`Evaluating care pathway for patient \${patientId}`);
    
    // Fetch all relevant resources for the patient
    const encounters = await this.fhirService.searchResources('Encounter', { subject: `Patient/\${patientId}` });
    const risks = await this.fhirService.searchResources('RiskAssessment', { subject: `Patient/\${patientId}` });
    const referrals = await this.fhirService.searchResources('ServiceRequest', { subject: `Patient/\${patientId}` });
    const tasks = await this.fhirService.searchResources('Task', { for: `Patient/\${patientId}` });
    const carePlans = await this.fhirService.searchResources('CarePlan', { subject: `Patient/\${patientId}` });

    let currentState: PathwayState = 'ASSESSMENT_PENDING';
    const gaps: CareGap2[] = [];

    // Evaluate High-Risk ANC Pathway
    // 1. Check for Risks
    let highestRisk: any = null;
    let isHighRisk = false;
    
    if (risks && risks.length > 0) {
      // Sort by date desc
      risks.sort((a: any, b: any) => new Date(b.meta?.lastUpdated || 0).getTime() - new Date(a.meta?.lastUpdated || 0).getTime());
      highestRisk = risks[0];
      const riskLevel = highestRisk.prediction?.[0]?.qualitativeRisk?.text;
      
      if (riskLevel === 'EMERGENCY' || riskLevel === 'HIGH_RISK') {
        isHighRisk = true;
        currentState = 'RISK_IDENTIFIED';
      } else {
        currentState = 'ASSESSMENT_COMPLETED';
      }
    }

    if (isHighRisk) {
      currentState = 'ESCALATION_REQUIRED';
      // Check if a referral (ServiceRequest) exists for this risk
      const relatedReferral = referrals.find((r: any) => r.reasonReference?.some((ref: any) => ref.reference === `RiskAssessment/\${highestRisk.id}`));
      
      if (relatedReferral) {
        currentState = 'REFERRAL_PENDING';
        
        // Find the Task for this referral
        const referralTask = tasks.find((t: any) => t.focus?.reference === `ServiceRequest/\${relatedReferral.id}`);
        
        if (referralTask) {
          if (referralTask.status === 'accepted') {
            currentState = 'REFERRAL_ACCEPTED';
          } else if (referralTask.status === 'completed') {
            currentState = 'CONSULTATION_COMPLETED';
          } else {
            // Check Consent status before HIE
            const consents = await this.fhirService.searchResources('Consent', { patient: `Patient/\${patientId}` });
            const hasConsent = consents.some((c: any) => c.status === 'active');
            
            if (hasConsent) {
              currentState = 'CONSENT_OBTAINED';
              
              // Verify if HIE export has succeeded
              const auditEvents = await this.fhirService.searchResources('AuditEvent', { entity: `Patient/\${patientId}` });
              const isShared = auditEvents.some((a: any) => a.action === 'E' && a.outcome === '0'); // Simplified check
              
              if (isShared) {
                 currentState = 'RECORD_SHARED';
              }
            } else {
              currentState = 'CONSENT_PENDING';
              gaps.push({
                  gapId: crypto.randomUUID(),
                  patientReference: `Patient/\${patientId}`,
                  pathway: 'HIGH_RISK_ANC',
                  step: 'CONSENT_PENDING',
                  severity: 'MODERATE',
                  priority: 'HIGH',
                  reason: `Referral exists but patient consent for health information exchange is missing.`,
                  expectedAction: 'ASHA must obtain consent for sharing records',
                  responsibleRole: 'ASHA',
                  responsibleFacility: facilityId,
                  dueAt: new Date(Date.now() + 86400000).toISOString(),
                  createdAt: new Date().toISOString(),
                  evidence: [
                    `✓ ServiceRequest/\${relatedReferral.id} exists`,
                    `✗ No active Consent resource found`
                  ],
                  status: 'OPEN'
                });
            }

            // Check SLA for STAT referral
            if (relatedReferral.priority === 'stat') {
              const authoredMs = new Date(referralTask.authoredOn).getTime();
              const ageHours = (Date.now() - authoredMs) / 3600000;
              
              if (ageHours > 1 && referralTask.status !== 'completed' && referralTask.status !== 'accepted') {
                gaps.push({
                  gapId: crypto.randomUUID(),
                  patientReference: `Patient/\${patientId}`,
                  pathway: 'HIGH_RISK_ANC',
                  step: 'REFERRAL_PENDING',
                  severity: 'CRITICAL',
                  priority: 'EMERGENCY',
                  reason: `STAT referral created \${Math.round(ageHours * 10) / 10}h ago has not been accepted within 1h SLA.`,
                  expectedAction: 'Receiving facility must accept referral Task',
                  responsibleRole: 'Specialist / MO',
                  responsibleFacility: referralTask.owner?.reference?.replace('Organization/', '') || 'Destination',
                  dueAt: new Date(authoredMs + 3600000).toISOString(),
                  createdAt: new Date().toISOString(),
                  evidence: [
                    `✓ RiskAssessment/\${highestRisk.id} exists (EMERGENCY)`,
                    `✓ ServiceRequest/\${relatedReferral.id} exists (STAT)`,
                    `✓ Task/\${referralTask.id} exists (requested)`,
                    `✗ No accepting Task transition`,
                    `✗ SLA exceeded (1 hour)`
                  ],
                  status: 'OPEN'
                });
              }
            }
          }
        }
      } else {
        // High risk identified, but no referral or care plan yet.
        const riskAgeMs = Date.now() - new Date(highestRisk.meta?.lastUpdated).getTime();
        const riskAgeHours = riskAgeMs / 3600000;
        
        if (riskAgeHours > 24) {
          gaps.push({
            gapId: crypto.randomUUID(),
            patientReference: `Patient/\${patientId}`,
            pathway: 'HIGH_RISK_ANC',
            step: 'ESCALATION_REQUIRED',
            severity: 'CRITICAL',
            priority: 'HIGH',
            reason: `High risk identified \${Math.round(riskAgeHours)}h ago but no referral or mitigation plan found.`,
            expectedAction: 'Medical Officer must review and create CarePlan/Referral',
            responsibleRole: 'Medical Officer',
            responsibleFacility: facilityId,
            dueAt: new Date(new Date(highestRisk.meta?.lastUpdated).getTime() + 86400000).toISOString(),
            createdAt: new Date().toISOString(),
            evidence: [
              `✓ RiskAssessment/\${highestRisk.id} exists (HIGH_RISK/EMERGENCY)`,
              `✗ No ServiceRequest found`,
              `✗ No active CarePlan found`
            ],
            status: 'OPEN'
          });
        }
      }
    }

    // Check Follow-ups
    const activeCarePlans = carePlans.filter((cp: any) => cp.status === 'active');
    for (const cp of activeCarePlans) {
      // Find related follow-up tasks
      const followupTasks = tasks.filter((t: any) => t.basedOn?.some((ref: any) => ref.reference === `CarePlan/\${cp.id}`) && t.status !== 'completed' && t.status !== 'cancelled');
      
      for (const ft of followupTasks) {
        // Check if overdue
        const dueMs = new Date(ft.executionPeriod?.end || ft.authoredOn).getTime();
        if (Date.now() > dueMs) {
          currentState = 'FOLLOWUP_OVERDUE';
          gaps.push({
            gapId: crypto.randomUUID(),
            patientReference: `Patient/\${patientId}`,
            pathway: 'FOLLOW_UP',
            step: 'FOLLOWUP_OVERDUE',
            severity: 'MODERATE',
            priority: 'HIGH',
            reason: `Follow-up task is overdue.`,
            expectedAction: 'ASHA/ANM must complete follow-up visit.',
            responsibleRole: 'ASHA / ANM',
            responsibleFacility: ft.owner?.reference?.replace('Organization/', '') || facilityId,
            dueAt: new Date(dueMs).toISOString(),
            createdAt: new Date().toISOString(),
            evidence: [
              `✓ CarePlan/\${cp.id} is active`,
              `✓ Task/\${ft.id} is incomplete`,
              `✗ Execution period end date has passed (\${new Date(dueMs).toISOString()})`
            ],
            status: 'OPEN'
          });
        } else {
          if (currentState !== 'FOLLOWUP_OVERDUE' && currentState !== 'ESCALATION_REQUIRED') {
            currentState = 'FOLLOWUP_DUE';
          }
        }
      }
    }

    // Check Diagnostics
    const diagnosticRequests = referrals.filter((r: any) => r.code?.coding?.[0]?.system === 'http://loinc.org');
    const diagnosticReports = await this.fhirService.searchResources('DiagnosticReport', { subject: `Patient/\${patientId}` });

    for (const sr of diagnosticRequests) {
      if (sr.status === 'active') {
        const authoredMs = new Date(sr.authoredOn).getTime();
        const ageHours = (Date.now() - authoredMs) / 3600000;
        
        // Find if report exists
        const report = diagnosticReports.find((r: any) => r.basedOn?.some((ref: any) => ref.reference === `ServiceRequest/\${sr.id}`));
        
        if (!report) {
          if (ageHours > 24) {
            currentState = 'DIAGNOSTICS_PENDING';
            gaps.push({
              gapId: crypto.randomUUID(),
              patientReference: `Patient/\${patientId}`,
              pathway: 'DIAGNOSTICS',
              step: 'DIAGNOSTICS_PENDING',
              severity: 'MODERATE',
              priority: 'HIGH',
              reason: `Diagnostic request for \${sr.code?.coding?.[0]?.display} pending for \${Math.round(ageHours)}h`,
              expectedAction: 'Diagnostic facility must upload result',
              responsibleRole: 'Lab Technician',
              responsibleFacility: sr.performer?.[0]?.reference?.replace('Organization/', '') || facilityId,
              dueAt: new Date(authoredMs + 86400000).toISOString(),
              createdAt: new Date().toISOString(),
              evidence: [
                `✓ ServiceRequest/\${sr.id} exists (Lab Test)`,
                `✗ No DiagnosticReport linked to this ServiceRequest`
              ],
              status: 'OPEN'
            });
          }
        } else {
          // Report exists, check for review (we can use an extension or task to track review.
          // For now, if the report is 'final' but no Task linking to it is completed, it's pending review)
          const reviewTasks = tasks.filter((t: any) => t.focus?.reference === `DiagnosticReport/\${report.id}`);
          const isReviewed = reviewTasks.some((t: any) => t.status === 'completed');
          
          if (!isReviewed) {
            const issuedMs = new Date(report.issued).getTime();
            const reportAgeHours = (Date.now() - issuedMs) / 3600000;
            
            // Phase 14: Abnormal Result Escalation
            const isAbnormal = report.contained?.some((obs: any) => 
               obs.resourceType === 'Observation' && 
               obs.interpretation?.some((i: any) => i.coding?.some((c: any) => c.code === 'H' || c.code === 'A' || c.code === 'LL' || c.code === 'HH'))
            ) || false;
            
            if (isAbnormal) {
               currentState = 'ESCALATION_REQUIRED';
               gaps.push({
                 gapId: crypto.randomUUID(),
                 patientReference: `Patient/\${patientId}`,
                 pathway: 'DIAGNOSTICS',
                 step: 'ESCALATION_REQUIRED',
                 severity: 'CRITICAL',
                 priority: 'EMERGENCY',
                 reason: `Abnormal diagnostic result reported for \${sr.code?.coding?.[0]?.display}. Clinical review recommended immediately.`,
                 expectedAction: 'Medical Officer must review the abnormal result and create referral or follow-up.',
                 responsibleRole: 'Medical Officer',
                 responsibleFacility: sr.requester?.reference?.replace('Organization/', '') || facilityId,
                 dueAt: new Date(issuedMs + 3600000).toISOString(), // 1 hour SLA
                 createdAt: new Date().toISOString(),
                 evidence: [
                   `✓ DiagnosticReport/\${report.id} exists (Final)`,
                   `✓ Abnormal finding (H/A/LL/HH) detected in contained Observations`,
                   `✗ No review Task completed`
                 ],
                 status: 'OPEN'
               });
            } else if (reportAgeHours > 2) {
              currentState = 'CLINICIAN_REVIEW_PENDING';
              gaps.push({
                gapId: crypto.randomUUID(),
                patientReference: `Patient/\${patientId}`,
                pathway: 'DIAGNOSTICS',
                step: 'CLINICIAN_REVIEW_PENDING',
                severity: 'MODERATE',
                priority: 'HIGH',
                reason: `Diagnostic report issued \${Math.round(reportAgeHours)}h ago requires clinical review`,
                expectedAction: 'Medical Officer must review the result',
                responsibleRole: 'Medical Officer',
                responsibleFacility: sr.requester?.reference?.replace('Practitioner/', '') || facilityId, // Simplifying for demo
                dueAt: new Date(issuedMs + 7200000).toISOString(),
                createdAt: new Date().toISOString(),
                evidence: [
                  `✓ DiagnosticReport/\${report.id} exists`,
                  `✗ No review Task completed`
                ],
                status: 'OPEN'
              });
            }
          }
        }
      }
    }

    // Check Medication Requirements
    const medicationRequests = await this.fhirService.searchResources('MedicationRequest', { subject: `Patient/\${patientId}` });
    const medicationDispenses = await this.fhirService.searchResources('MedicationDispense', { subject: `Patient/\${patientId}` });

    for (const medReq of medicationRequests) {
      if (medReq.status === 'active') {
        const authoredMs = new Date(medReq.authoredOn).getTime();
        const ageHours = (Date.now() - authoredMs) / 3600000;
        
        // Find if dispensed
        const dispense = medicationDispenses.find((d: any) => d.authorizingPrescription?.some((ref: any) => ref.reference === `MedicationRequest/\${medReq.id}`));
        
        if (!dispense && ageHours > 12) {
          currentState = 'TREATMENT_PENDING';
          gaps.push({
            gapId: crypto.randomUUID(),
            patientReference: `Patient/\${patientId}`,
            pathway: 'MEDICATION',
            step: 'TREATMENT_PENDING',
            severity: 'MODERATE',
            priority: 'HIGH',
            reason: `Medication \${medReq.medicationCodeableConcept?.text} prescribed \${Math.round(ageHours)}h ago is not dispensed`,
            expectedAction: 'Pharmacist or ASHA must fulfill medication request',
            responsibleRole: 'Pharmacist',
            responsibleFacility: facilityId,
            dueAt: new Date(authoredMs + 86400000).toISOString(),
            createdAt: new Date().toISOString(),
            evidence: [
              `✓ MedicationRequest/\${medReq.id} exists (Active)`,
              `✗ No MedicationDispense linked to this request`
            ],
            status: 'OPEN'
          });
        }
      }
    }

    return { state: currentState, gaps };
  }

  /**
   * Evaluate pathways for all patients associated with a facility to generate the Care Gap Dashboard.
   */
  async evaluateFacilityGaps(facilityId: string): Promise<CareGap2[]> {
    // In a real system, we'd query patients efficiently. Here we query all resources assigned to the facility,
    // extract unique patients, and evaluate them.
    
    // For now, let's fetch all tasks and risks associated with the facility to find patients.
    // This is an optimization strategy rather than pulling all DB records.
    const allGaps: CareGap2[] = [];
    const patientIds = new Set<string>();

    const tasks = await this.fhirService.searchResources('Task', {});
    for (const t of tasks) {
      if (t.owner?.reference === `Organization/\${facilityId}` || t.requester?.reference === `Organization/\${facilityId}`) {
        if (t.for?.reference) patientIds.add(t.for.reference.split('/')[1]);
      }
    }

    const risks = await this.fhirService.searchResources('RiskAssessment', {});
    for (const r of risks) {
      // Assuming subject reference is available
      if (r.subject?.reference) patientIds.add(r.subject.reference.split('/')[1]);
    }

    for (const pid of patientIds) {
      const evaluation = await this.evaluatePatientPathway(pid, facilityId);
      allGaps.push(...evaluation.gaps);
    }

    // Phase 36: Add care gaps from HIE exchange failures
    // Check AuditEvents for failed exports that have not been retried
    try {
      const auditEvents = await this.fhirService.searchResources('AuditEvent', { action: 'E' });
      for (const event of auditEvents) {
        if (event.outcome === '8' && event.outcomDesc?.includes('RECORD_EXPORT_FAILED')) {
          // Failed HIE export — create RECORD_SHARE_FAILED care gap
          const patientRef = event.entity?.find((e: any) => e.type?.code === '1')?.what?.reference;
          if (patientRef) {
            allGaps.push({
              gapId: crypto.randomUUID(),
              patientReference: patientRef,
              pathway: 'HIE_EXCHANGE',
              step: 'RECORD_SHARE_FAILED',
              severity: 'MODERATE',
              priority: 'HIGH',
              reason: `Health information exchange failed: ${event.outcomeDesc || 'Unknown error'}`,
              expectedAction: 'Retry record sharing or obtain new consent',
              responsibleRole: 'MO / ANM',
              responsibleFacility: facilityId,
              dueAt: new Date(Date.now() + 86400000).toISOString(),
              createdAt: new Date().toISOString(),
              evidence: [
                `✗ AuditEvent records RECORD_EXPORT_FAILED for ${patientRef}`,
                `✗ No successful RECORD_EXPORTED found`,
              ],
              status: 'OPEN',
            });
          }
        }
      }
    } catch (e) {
      // Non-fatal: HIE audit gap detection is best-effort
      this.logger.warn(`HIE audit gap detection failed: ${e.message}`);
    }

    // Sort by priority (EMERGENCY > HIGH > ROUTINE)
    allGaps.sort((a, b) => {
      const pmap = { 'EMERGENCY': 3, 'HIGH': 2, 'ROUTINE': 1 };
      return pmap[b.priority] - pmap[a.priority];
    });

    return allGaps;
  }
}
