# SIH-26133 — PHASE 12 MASTER PROMPT

# POPULATION HEALTH INTELLIGENCE + PREDICTIVE RISK + RESOURCE OPTIMIZATION

## MISSION

Phase 12 transforms Setu from a system that reacts to individual patient problems into a system that can identify **population-level risks, predict operational bottlenecks, and proactively allocate healthcare resources**.

The platform already has:

```text
Offline-first clinical capture
FHIR
Authentication
RBAC
Facility isolation
Referral workflows
Teleconsultation
Clinical rule engine
Care gaps
Medication inventory
Diagnostics
Audit
Provenance
Interoperability
```

Now build the intelligence layer above these foundations.

The objective is to answer:

```text
Which patients need attention?

Which care gaps are becoming dangerous?

Which facilities are overloaded?

Which medicines are likely to run out?

Which referrals are likely to breach SLA?

Which geographic areas are showing deterioration?

Where should healthcare resources be deployed?

What evidence supports every prediction?
```

---

# ABSOLUTE RULE

Do NOT create fake AI.

Do NOT use random predictions.

Do NOT hardcode attractive dashboard percentages.

Do NOT claim medical prediction accuracy without validation.

Do NOT use patient-sensitive information unnecessarily.

Do NOT replace the deterministic clinical rule engine with an opaque model.

The system must distinguish:

```text
RULE-BASED
STATISTICAL
PREDICTIVE
HEURISTIC
SIMULATION
```

Every intelligence output must identify which category it belongs to.

---

# PHASE 0 — INTELLIGENCE AUDIT

Inspect the entire repository.

Find all existing:

```text
AnalyticsService
CarePathwayService
CareGap
QueueService
AlertService
Inventory
Referral
Triage
RiskAssessment
Dashboard
```

Search for:

```text
score
risk
prediction
analytics
trend
forecast
AI
ML
model
threshold
```

Create:

```text
PHASE_12_INTELLIGENCE_AUDIT.md
```

Classify every existing metric as:

```text
REAL
DERIVED
HEURISTIC
MOCK
UNKNOWN
```

Remove misleading claims.

---

# PHASE 1 — INTELLIGENCE ARCHITECTURE

Create:

```text
INTELLIGENCE_ARCHITECTURE.md
```

Architecture:

```text
FHIR Clinical Data
        ↓
Data Quality Layer
        ↓
Feature Extraction
        ↓
Deterministic Analytics
        ↓
Risk Models
        ↓
Operational Forecasting
        ↓
Resource Optimization
        ↓
Human Decision Support
```

The intelligence layer must NEVER directly mutate clinical records.

It can recommend actions.

Authorized humans remain responsible for clinical decisions.

---

# PHASE 2 — DATA QUALITY GATE

Before intelligence calculations, evaluate source quality.

For each dataset calculate:

```text
completeness
freshness
validity
duplication
coverage
```

Do not generate high-confidence predictions from obviously incomplete data.

---

# PHASE 3 — DATA FRESHNESS

Every intelligence output must know:

```text
data_start
data_end
last_updated
source_count
facility_count
```

Display freshness to administrators.

---

# PHASE 4 — POPULATION HEALTH MODEL

Create a district-level population health representation.

Dimensions:

```text
facility
geography
age group
sex where clinically appropriate
pregnancy/ANC cohort
risk category
referral status
care-gap status
medicine availability
diagnostic workload
```

Avoid unnecessary personal identifiers.

---

# PHASE 5 — COHORT ENGINE

Create reusable cohort definitions.

Examples:

```text
ANC patients
high-risk ANC
emergency patients
patients with unresolved care gaps
patients awaiting referrals
patients awaiting diagnostics
patients with medication treatment pending
```

Cohorts must be generated from actual FHIR data.

---

# PHASE 6 — COHORT VERSIONING

Each cohort definition must have:

```text
cohortId
version
definition
effectiveDate
```

A historical dashboard should remain reproducible.

---

# PHASE 7 — FACILITY HEALTH SCORE

Create a facility operational health model.

Potential components:

```text
referral backlog
SLA breaches
queue length
medicine shortages
diagnostic backlog
sync reliability
care-gap backlog
```

Do not combine arbitrary values.

Document the exact formula.

---

# PHASE 8 — FACILITY SCORE EXPLAINABILITY

Every score must be decomposable.

Example:

```text
Facility Health Score: 62

Contributors:
Referral backlog       -15
Medicine availability  -8
Diagnostic backlog     -7
Care gaps              -5
Sync reliability       +5
```

Never display a score without explaining why it exists.

---

# PHASE 9 — PATIENT PRIORITIZATION

Create a patient prioritization model for operational follow-up.

Inputs may include:

```text
emergency risk
high-risk assessment
unresolved care gap
referral SLA
missed follow-up
treatment pending
```

This is NOT a diagnosis model.

It determines:

```text
WHO SHOULD BE REVIEWED FIRST
```

not:

```text
WHO HAS A DISEASE
```

---

# PHASE 10 — PATIENT PRIORITY EXPLAINABILITY

For every priority:

```text
Priority: HIGH

Reasons:
Emergency RiskAssessment
Referral SLA breached
Follow-up overdue
```

Never output:

```text
HIGH RISK
```

without the reasons.

---

# PHASE 11 — EMERGENCY PRIORITY

Emergency clinical signals must always outrank operational optimization.

The system must never prioritize:

```text
medicine stock optimization
queue efficiency
facility workload
```

above:

```text
patient safety
emergency clinical escalation
```

---

# PHASE 12 — REFERRAL BREACH PREDICTION

Build a deterministic operational predictor for referral SLA risk.

Possible inputs:

```text
priority
elapsed time
destination queue
destination availability
distance
historical processing time
```

Output:

```text
LOW
MEDIUM
HIGH
BREACHING
```

This predicts operational delay.

It must NOT predict clinical deterioration unless separately validated.

---

# PHASE 13 — REFERRAL ETA

Where sufficient historical data exists:

Estimate:

```text
expected completion time
```

Include:

```text
confidence
data volume
calculation method
```

If insufficient data exists:

```text
NOT ENOUGH DATA
```

Do not fabricate an ETA.

---

# PHASE 14 — QUEUE FORECASTING

For each receiving facility calculate:

```text
current queue
incoming referrals
average processing rate
estimated backlog
```

Forecast:

```text
next 6h
next 24h
next 48h
```

Only display forecasts supported by sufficient data.

---

# PHASE 15 — QUEUE SURGE DETECTION

Detect unusual referral volume.

Example:

```text
Normal:
20 referrals/day

Current:
47 referrals/day
```

Output:

```text
UNUSUAL_SURGE
```

with baseline definition.

---

# PHASE 16 — MEDICINE DEMAND FORECAST

Use actual:

```text
MedicationRequest
MedicationDispense
historical consumption
current stock
```

to estimate medicine demand.

---

# PHASE 17 — STOCKOUT RISK

For each important medicine calculate:

```text
current stock
average daily consumption
days of stock remaining
incoming supply
```

Output:

```text
SAFE
WATCH
STOCKOUT_RISK
STOCKOUT
```

---

# PHASE 18 — STOCKOUT EXPLAINABILITY

Example:

```text
Iron/Folic Acid

Current stock: 420
Average daily consumption: 75
Estimated stock remaining: 5.6 days

Status:
STOCKOUT_RISK
```

Never display unexplained warnings.

---

# PHASE 19 — MEDICINE PRIORITIZATION

When multiple facilities require limited inventory:

Create a transparent prioritization algorithm based on:

```text
patient demand
clinical urgency
current stock
expected consumption
distance
existing supply
```

Do not optimize purely for quantity.

---

# PHASE 20 — RESOURCE ALLOCATION ENGINE

Create an operational recommendation engine.

Potential resources:

```text
medicines
specialists
teleconsult slots
laboratory capacity
ambulance/referral capacity
health-worker attention
```

Output recommendations.

Do NOT automatically execute them.

---

# PHASE 21 — HUMAN APPROVAL

Every resource recommendation should support:

```text
ACCEPT
REJECT
MODIFY
```

The decision must be audited.

---

# PHASE 22 — RECOMMENDATION AUDIT

Record:

```text
recommendationId
algorithm version
inputs
recommendation
actor
decision
reason
timestamp
```

---

# PHASE 23 — GEOGRAPHIC INTELLIGENCE

Use facility coordinates already present in the platform.

Calculate:

```text
distance
travel burden
facility accessibility
referral routing
```

Use deterministic calculations.

---

# PHASE 24 — GEOGRAPHIC HOTSPOTS

Identify areas with unusual:

```text
high-risk cases
referral demand
care gaps
medicine shortages
diagnostic backlog
```

Use aggregate geography.

Do not expose patient coordinates.

---

# PHASE 25 — HOTSPOT SAFETY

Do not claim:

```text
disease outbreak
```

merely because a cluster exists.

Use wording such as:

```text
UNUSUAL CLINICAL ACTIVITY
```

until epidemiological validation exists.

---

# PHASE 26 — TEMPORAL TREND ENGINE

For important metrics calculate:

```text
daily
weekly
monthly
```

trends.

Show:

```text
current
previous period
change
baseline
```

---

# PHASE 27 — TREND SIGNIFICANCE

Do not call every change a meaningful trend.

Require configurable minimum data volume.

If insufficient:

```text
INSUFFICIENT SAMPLE
```

---

# PHASE 28 — ANOMALY DETECTION

Create deterministic anomaly detection for:

```text
referral volume
medicine consumption
diagnostic volume
care gaps
emergency risk events
```

Possible methods:

```text
moving average
rolling standard deviation
baseline deviation
```

Document the algorithm.

---

# PHASE 29 — ANOMALY EXPLANATION

Every anomaly should show:

```text
baseline
observed
difference
period
confidence/data volume
```

---

# PHASE 30 — CLINICAL RULE ENGINE VS POPULATION MODEL

Keep these separate.

Clinical rule engine:

```text
patient-level deterministic clinical protocol
```

Population model:

```text
aggregate operational/epidemiological intelligence
```

Never allow population analytics to silently change patient clinical rules.

---

# PHASE 31 — PREDICTIVE MODEL INTERFACE

Create an abstraction:

```text
PredictionEngine
```

with:

```text
modelId
version
inputSchema
outputSchema
predict()
explain()
```

---

# PHASE 32 — MODEL REGISTRY

Create:

```text
MODEL_REGISTRY.md
```

Every model must specify:

```text
model
version
purpose
inputs
outputs
training data
validation data
known limitations
```

If no ML model exists:

```text
RULE-BASED
```

must be explicitly stated.

---

# PHASE 33 — MODEL VERSIONING

Predictions must retain:

```text
modelId
modelVersion
timestamp
input snapshot/version
```

so they are reproducible.

---

# PHASE 34 — PREDICTION CONFIDENCE

Never show:

```text
92% accurate
```

unless this has actually been validated.

Instead expose:

```text
confidence
sample size
model status
```

where statistically meaningful.

---

# PHASE 35 — NO AUTOMATIC DIAGNOSIS

The intelligence layer must never silently generate:

```text
patient has disease X
```

unless the clinical rule/protocol explicitly supports that classification.

Predictive outputs should be:

```text
requires review
likely operational delay
stockout risk
follow-up priority
```

---

# PHASE 36 — MODEL DRIFT

Where predictive models are used, monitor:

```text
input distribution
prediction distribution
outcome distribution
```

Flag potential drift.

---

# PHASE 37 — MODEL PERFORMANCE

Where ground truth exists, calculate:

```text
precision
recall
F1
sensitivity
specificity
```

Do not optimize only accuracy.

---

# PHASE 38 — CLINICAL SAFETY METRICS

For high-risk workflows track:

```text
false negatives
false positives
missed escalations
delayed referrals
```

A false negative in an emergency workflow is more serious than an operational false positive.

---

# PHASE 39 — HUMAN OVERRIDE

Any intelligence recommendation must support:

```text
override
reason
actor
timestamp
```

---

# PHASE 40 — ALERT PRIORITIZATION

Upgrade AlertService.

Alerts should be ranked:

```text
CRITICAL
HIGH
MEDIUM
LOW
```

based on explicit rules.

---

# PHASE 41 — ALERT FATIGUE PROTECTION

Do not send repeated alerts for the same unresolved issue.

Implement:

```text
deduplication
cooldown
aggregation
escalation
```

---

# PHASE 42 — ALERT ESCALATION

Example:

```text
Referral SLA warning
↓
No action
↓
SLA breach
↓
Escalate
↓
District operational alert
```

---

# PHASE 43 — ALERT ACKNOWLEDGEMENT

Support:

```text
ACKNOWLEDGED
IN_PROGRESS
RESOLVED
```

where appropriate.

---

# PHASE 44 — ALERT RESOLUTION EVIDENCE

An alert should disappear only when the underlying condition is resolved.

Do not resolve it simply because:

```text
Dismiss
```

was pressed.

---

# PHASE 45 — DISTRICT COMMAND CENTER

Build a genuine operational dashboard.

Show:

```text
Population
Active high-risk cohort
Emergency referrals
SLA breaches
Care gaps
Medicine stockout risks
Diagnostic backlog
Facility load
Sync health
Exchange health
```

---

# PHASE 46 — COMMAND CENTER DRILL-DOWN

Hierarchy:

```text
District
↓
Facility
↓
Operational category
↓
Patient cohort
↓
Patient
```

Respect RBAC at every level.

---

# PHASE 47 — PRIVACY-PRESERVING DASHBOARD

Default district view should show:

```text
counts
rates
trends
facility aggregates
```

Patient details require appropriate authorization.

---

# PHASE 48 — DATA FRESHNESS

Every dashboard panel should clearly show:

```text
Last updated
Data source
Data period
```

---

# PHASE 49 — DASHBOARD DEFINITIONS

Create:

```text
ANALYTICS_DICTIONARY.md
```

For every metric:

```text
Name
Definition
FHIR source
Calculation
Filters
Time window
Refresh interval
```

---

# PHASE 50 — KPI CORRECTNESS

Audit existing metrics such as:

```text
Referral Completion %
Stock Availability %
SLA %
Care Gap Resolution %
```

Ensure denominators are correct.

Example:

Do not calculate:

```text
completed / all referrals ever
```

when the dashboard claims:

```text
this month's completion rate
```

---

# PHASE 51 — DENOMINATOR TRANSPARENCY

Where useful display:

```text
Completed: 84
Eligible: 103
Rate: 81.6%
```

rather than only:

```text
81.6%
```

---

# PHASE 52 — DATA QUALITY IMPACT

If missing data materially affects a metric:

Display:

```text
DATA QUALITY WARNING
```

---

# PHASE 53 — OPERATIONAL SIMULATION

Create a simulation engine capable of testing:

```text
facility closure
medicine shortage
specialist unavailable
referral surge
network outage
diagnostic backlog
```

---

# PHASE 54 — WHAT-IF ANALYSIS

Allow district administrators to ask:

```text
What happens if PHC-A receives 30% more referrals?

What happens if medicine supply is delayed 7 days?

What happens if Specialist X is unavailable?

What happens if Facility B goes offline?
```

---

# PHASE 55 — SIMULATION OUTPUT

Show:

```text
baseline
scenario
difference
affected facilities
affected queues
affected stock
```

Clearly label:

```text
SIMULATION
```

Never mix simulation results with real operational metrics.

---

# PHASE 56 — RESOURCE OPTIMIZATION

Create a recommendation algorithm for:

```text
medicine redistribution
specialist allocation
teleconsult slots
laboratory workload
```

The algorithm must be explainable.

---

# PHASE 57 — OPTIMIZATION OBJECTIVE

Document exactly what the algorithm optimizes.

Example:

```text
minimize referral delay
subject to:
facility capacity
distance
specialist availability
clinical priority
```

---

# PHASE 58 — CONSTRAINT SAFETY

Optimization must NEVER violate:

```text
clinical urgency
facility scope
patient consent
health-worker authorization
medicine safety
```

---

# PHASE 59 — RECOMMENDATION PREVIEW

Before applying a recommendation:

Show:

```text
Current state
Proposed change
Expected benefit
Potential downside
Affected facilities
```

---

# PHASE 60 — HUMAN APPROVAL WORKFLOW

Authorized administrator:

```text
Review
↓
Accept / Modify / Reject
↓
Reason
↓
Audit
```

---

# PHASE 61 — RESOURCE ALLOCATION AUDIT

Every accepted allocation should generate:

```text
AuditEvent
Provenance
```

where appropriate.

---

# PHASE 62 — INTELLIGENCE API

Create clean API boundaries:

```text
GET /analytics/population
GET /analytics/facilities
GET /analytics/care-gaps
GET /analytics/referrals
GET /analytics/inventory
GET /analytics/anomalies
GET /analytics/forecast
GET /analytics/recommendations
```

Adapt naming to the existing API conventions.

Do not duplicate existing endpoints unnecessarily.

---

# PHASE 63 — API AUTHORIZATION

Analytics access must respect:

```text
district
facility
role
```

A facility worker must not retrieve district-wide restricted data merely by modifying query parameters.

---

# PHASE 64 — QUERY ABUSE PROTECTION

Protect analytics APIs against:

```text
unbounded date ranges
huge page sizes
expensive FHIR queries
repeated expensive aggregation
```

---

# PHASE 65 — PRECOMPUTATION

Where appropriate, move expensive population analytics away from synchronous patient-facing requests.

Consider:

```text
scheduled aggregation
materialized views
cached summaries
```

Do not sacrifice correctness for speed.

---

# PHASE 66 — EVENT-DRIVEN ANALYTICS

Where architecture supports it, consider generating analytics updates from domain events:

```text
ReferralCreated
ReferralAccepted
RiskIdentified
MedicationDispensed
CareGapCreated
CareGapResolved
```

Do not create an unnecessarily complex event bus if current scale does not justify it.

---

# PHASE 67 — EVENT IDEMPOTENCY

Analytics consumers must handle duplicate events safely.

---

# PHASE 68 — ANALYTICS REBUILD

Provide a mechanism to rebuild derived analytics from FHIR source data.

This is critical.

If derived tables are corrupted:

```text
FHIR remains source of truth
↓
analytics rebuilt
```

---

# PHASE 69 — ANALYTICS CONSISTENCY

Create reconciliation checks:

```text
FHIR count
vs
derived analytics count
```

Flag discrepancies.

---

# PHASE 70 — POPULATION SNAPSHOT

Support reproducible historical snapshots.

Example:

```text
District population state:
2026-09-01 00:00
```

This allows administrators to compare periods consistently.

---

# PHASE 71 — TREND SNAPSHOT AUDIT

Historical analytics should not unexpectedly change because an old record was edited.

Document whether metrics are:

```text
live reconstructed
OR
historically snapshotted
```

---

# PHASE 72 — PERFORMANCE

Benchmark:

```text
10,000 patients
100,000 FHIR resources
1,000 referrals
10,000 observations
```

where practical.

Measure:

```text
dashboard latency
FHIR query latency
aggregation latency
database load
memory
```

---

# PHASE 73 — SCALE TEST

Test progressively:

```text
1 facility
10 facilities
100 facilities
```

Do not claim larger scale without testing.

---

# PHASE 74 — ANALYTICS FAILURE

If analytics processing fails:

Clinical workflows must continue.

Example:

```text
Analytics DOWN
≠
Patient capture DOWN
```

---

# PHASE 75 — INTELLIGENCE FAILURE

If the prediction engine fails:

The platform must fall back to deterministic rules and human workflows.

Never block emergency clinical care because analytics is unavailable.

---

# PHASE 76 — MODEL FAILURE

If a model produces invalid output:

```text
reject prediction
log failure
use safe fallback
```

---

# PHASE 77 — ADVERSARIAL DATA

Test:

```text
negative stock
future dates
impossible vitals
duplicate referrals
missing facilities
invalid coordinates
zero denominators
extreme values
```

---

# PHASE 78 — STATISTICAL EDGE CASES

Handle:

```text
zero observations
one observation
small sample
all identical values
missing periods
large outliers
```

without producing misleading predictions.

---

# PHASE 79 — POPULATION PRIVACY

Audit aggregate outputs for re-identification risk.

Avoid exposing tiny cohorts where inappropriate.

---

# PHASE 80 — ROLE-SPECIFIC INTELLIGENCE

Different roles should see different intelligence.

Example:

```text
ASHA:
patient follow-up priorities

Medical Officer:
clinical + referral workload

Specialist:
incoming referrals + consultation workload

Pharmacist:
medicine demand/stock

District Admin:
population + facility operations
```

---

# PHASE 81 — MOBILE INTELLIGENCE

Offline mobile dashboard should remain lightweight.

Cache only useful aggregates.

Do not attempt to run expensive district analytics on low-end devices.

---

# PHASE 82 — OFFLINE PRIORITY LIST

The frontline app should maintain a local prioritized worklist:

```text
Emergency
High-risk
Overdue follow-up
Pending referral
Treatment pending
```

It must work offline.

---

# PHASE 83 — WORKLIST EXPLAINABILITY

Every worklist item should show:

```text
why this patient is here
what action is required
deadline
current state
sync state
```

---

# PHASE 84 — WORKLIST SAFETY

A patient should not disappear from the worklist because:

```text
network unavailable
analytics service unavailable
```

The locally persisted clinical state remains authoritative for offline work.

---

# PHASE 85 — INTELLIGENCE NOTIFICATIONS

Notifications should remain PHI-minimal.

Use:

```text
"3 urgent clinical reviews require attention."
```

rather than unnecessary patient details.

---

# PHASE 86 — NOTIFICATION DEDUPLICATION

Prevent notification storms.

---

# PHASE 87 — EXPLAINABLE AI UI

If any predictive model exists, display:

```text
Prediction
Confidence / evidence
Main contributing factors
Data freshness
Model version
Limitations
```

Do not create fake SHAP-like explanations.

---

# PHASE 88 — MODEL CARD

For every ML model create:

```text
MODEL_CARD_<model>.md
```

Include:

```text
purpose
intended users
training data
validation
limitations
bias considerations
failure modes
human oversight
```

If there is no actual ML model, explicitly document that.

---

# PHASE 89 — BIAS AUDIT

Where demographic or geographic variables are used:

Check whether recommendations systematically disadvantage:

```text
remote facilities
small facilities
low-volume populations
```

---

# PHASE 90 — FAIRNESS

Resource optimization must not simply favor facilities with:

```text
higher reporting volume
better connectivity
larger populations
```

without considering need.

---

# PHASE 91 — CONNECTIVITY BIAS

A facility with poor connectivity may appear to have:

```text
fewer patients
fewer referrals
fewer observations
```

when it actually has incomplete reporting.

Analytics must account for this.

---

# PHASE 92 — REPORTING COMPLETENESS

Add:

```text
REPORTING_COMPLETENESS
```

to facility analytics.

Example:

```text
Facility A
Reported records: 920
Expected reporting coverage: 94%

Facility B
Reported records: 420
Expected reporting coverage: 51%
```

Do not interpret B as automatically lower disease burden.

---

# PHASE 93 — CONNECTIVITY HEALTH

Track:

```text
last sync
pending operations
failed operations
average sync delay
```

at facility level.

---

# PHASE 94 — DATA CONFIDENCE

Every population metric should optionally expose:

```text
HIGH
MEDIUM
LOW
```

data confidence based on:

```text
freshness
coverage
sample size
validation quality
```

---

# PHASE 95 — COMMAND CENTER DESIGN

Build a high-quality district command center.

Top-level:

```text
DISTRICT HEALTH STATUS
```

Then:

```text
Emergency
High Risk
Referral SLA
Care Gaps
Medicine Risk
Diagnostic Load
Facility Health
Connectivity
```

---

# PHASE 96 — MAP VIEW

If using a map:

Show aggregate facility markers.

Do not show patient-level coordinates.

Marker state can represent:

```text
normal
warning
critical
offline
```

---

# PHASE 97 — FACILITY COMPARISON

Allow authorized administrators to compare facilities.

Compare:

```text
referral performance
care-gap closure
stock
diagnostic backlog
sync health
```

But provide context for facility size and reporting completeness.

---

# PHASE 98 — DISTRICT ALERT FEED

Create a prioritized operational feed:

```text
CRITICAL:
3 emergency referrals breached

HIGH:
2 facilities projected to stock out

MEDIUM:
Diagnostic backlog rising
```

---

# PHASE 99 — ACTIONABLE DASHBOARD

Every major dashboard alert should lead to an action.

Example:

```text
Stockout risk
→ View facilities
→ Review inventory
→ Create redistribution recommendation
```

---

# PHASE 100 — FINAL FLAGSHIP DEMO

Create:

```text
PHASE_12_POPULATION_INTELLIGENCE_DEMO.md
```

Scenario:

```text
1. Jane Doe emergency case exists.
2. Several referrals enter district system.
3. Facility queue begins increasing.
4. Referral engine detects SLA risk.
5. Medicine consumption increases.
6. Stockout risk appears.
7. District command center detects both problems.
8. System explains contributing factors.
9. Resource optimization recommends redistribution.
10. Administrator reviews recommendation.
11. Administrator accepts.
12. AuditEvent records decision.
13. Facility inventory updates.
14. Referral backlog decreases.
15. Care gaps remain visible until clinically resolved.
```

---

# PHASE 101 — FAILURE DEMO

During the demo:

```text
Stop analytics service.
```

Verify:

```text
patient capture continues
offline workflow continues
referral workflow continues
```

Restart analytics.

Verify:

```text
derived analytics rebuild
```

---

# PHASE 102 — NO-MAGIC DEMO

For every dashboard prediction the judge should be able to click:

```text
WHY?
```

and see:

```text
data source
calculation
time period
sample size
algorithm version
confidence
```

This is a major differentiator.

---

# PHASE 103 — FINAL TRACEABILITY

Create:

```text
PHASE_12_TRACEABILITY.md
```

Map:

```text
SIH requirement
↓
population problem
↓
FHIR data
↓
analytics
↓
prediction
↓
recommendation
↓
human decision
↓
audit
↓
test
```

---

# PHASE 104 — FINAL ARTIFACTS

Create:

```text
PHASE_12_INTELLIGENCE_AUDIT.md
INTELLIGENCE_ARCHITECTURE.md
ANALYTICS_DICTIONARY.md
MODEL_REGISTRY.md
PHASE_12_POPULATION_INTELLIGENCE_DEMO.md
PHASE_12_TRACEABILITY.md
PHASE_12_FINAL_REPORT.md
```

Additionally create model cards only if actual ML models are implemented.

---

# PHASE 105 — FINAL REPORT

Return:

## 1. Executive Summary

## 2. Intelligence Architecture

## 3. Existing Analytics Audit

## 4. Population Cohorts

## 5. Facility Intelligence

## 6. Patient Prioritization

## 7. Referral Forecasting

## 8. Medicine Forecasting

## 9. Geographic Intelligence

## 10. Anomaly Detection

## 11. Resource Optimization

## 12. Predictive Models

## 13. Explainability

## 14. Bias/Fairness

## 15. Privacy

## 16. Data Quality

## 17. Performance

## 18. Failure Testing

## 19. Offline Intelligence

## 20. Security Testing

## 21. REAL vs HEURISTIC vs PREDICTIVE vs SIMULATION vs UNVERIFIED

## 22. Test Evidence

## 23. Production Readiness

## 24. SIH Traceability

## 25. Remaining P0/P1 Risks

## 26. Final Judge Demo

---

# ABSOLUTE RULES

1. No fake AI.
2. No random predictions.
3. No fake accuracy.
4. No fake confidence.
5. No fake population statistics.
6. No fake resource optimization.
7. No automatic diagnosis.
8. No intelligence output may override clinical rules.
9. No intelligence failure may block clinical care.
10. No patient-level PHI in aggregate dashboards unless authorized.
11. No patient coordinates on public/aggregate maps.
12. No optimization without explicit objective and constraints.
13. No recommendation without explanation.
14. No recommendation execution without appropriate human authorization.
15. No historical metric without a defined time window.
16. No percentage without a defensible denominator.
17. No prediction without sufficient data.
18. No population conclusion from incomplete reporting.
19. No production claim without actual evidence.
20. Clearly distinguish REAL / DERIVED / HEURISTIC / PREDICTIVE / SIMULATION / UNVERIFIED.

---

# STOP CONDITION

After completing Phase 12:

STOP.

Do NOT start Phase 13.

Return the complete Phase 12 final report and wait for further instructions.
