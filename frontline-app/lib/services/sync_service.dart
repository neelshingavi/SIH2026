// This file is intentionally minimal.
// The canonical sync implementation is in sync_coordinator.dart.
// SyncCoordinator handles push/pull/retry/backoff/conflict/idempotency.
//
// This file remains only as a re-export to avoid breaking any import
// that might reference it. Use SyncCoordinator directly.
export 'sync_coordinator.dart' show SyncCoordinator, SyncStatus;
