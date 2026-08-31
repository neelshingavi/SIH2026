# PHASE 6 FORENSIC AUDIT

## 1. Mocks and Fake Data found in Source Code
- `core-gateway/api/src/analytics/analytics.service.ts`: Diagnostic turnaround time calculation uses a mock requested date approximation.
- `core-gateway/api/src/auth/roles.guard.ts`: Contains a comment `For now, let's mock it for the sake of the skeleton`.
- `core-gateway/api/test/referral.e2e-spec.ts` & `security.e2e-spec.ts`: Tests use mock identifiers (e.g. `mock-task-123`).

## 2. Hardcoded URLs and Configurations found
The following files hardcode `localhost` instead of using environment configuration:
- `frontline-app/lib/main.dart`
- `frontline-app/lib/services/auth_service.dart`
- `frontline-app/lib/services/sync_service.dart`
- `frontline-app/lib/services/sync_coordinator.dart`
- `frontline-app/lib/screens/teleconsult/teleconsult_room_screen.dart`
- `frontline-app/lib/screens/referrals/referral_dashboard_screen.dart`
- `core-gateway/docker-compose.yml`

## 3. Discrepancies and Incomplete Workflows
- **Diagnostic Turnaround Time (TAT)**: The TAT computation in analytics service skips the complex FHIR graph and uses a shortcut.
- **Roles Guard (Security)**: The roles guard for authorization is currently mocked, allowing unsafe access.
- **Frontend Configuration**: The Flutter application lacks an environment configuration file, locking the build to local development servers.

**ACTION PLAN:**
1. Fix Analytics service to properly resolve `DiagnosticReport -> basedOn -> ServiceRequest -> authoredOn` for true TAT calculation.
2. Fix `RolesGuard` to actually decode the JWT and compare `user.facilityId` or `user.role`.
3. Create `Config` class in Flutter and replace all `localhost` strings.
