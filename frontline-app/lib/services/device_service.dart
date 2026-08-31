import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:uuid/uuid.dart';

/// Manages stable device identity and JWT claim extraction.
///
/// Device ID: generated once on first launch and stored in FlutterSecureStorage.
/// This ensures every resource/sync operation is attributed to the same device
/// across app restarts, meeting Phase 1 §16 requirement.
///
/// JWT claims: parsed from the stored access token to extract userId,
/// facilityId, and role — eliminating hardcoded IDs in the UI layer.
class DeviceService {
  static const _kDeviceId = 'setu_device_id';
  static const _kUserId = 'setu_user_id';
  static const _kFacilityId = 'setu_facility_id';
  static const _kRole = 'setu_role';
  static const _kToken = 'jwt_token';

  final FlutterSecureStorage _storage;
  final Uuid _uuid;

  DeviceService({
    FlutterSecureStorage? storage,
    Uuid? uuid,
  })  : _storage = storage ?? const FlutterSecureStorage(),
        _uuid = uuid ?? const Uuid();

  /// Returns the stable device UUID, generating and persisting it if needed.
  Future<String> getDeviceId() async {
    var id = await _storage.read(key: _kDeviceId);
    if (id == null || id.isEmpty) {
      id = _uuid.v4();
      await _storage.write(key: _kDeviceId, value: id);
    }
    return id;
  }

  /// Stores claims from a JWT after successful login.
  /// Claims are stored individually so they survive token refresh without
  /// re-parsing the JWT on every read.
  Future<void> storeUserContext({
    required String userId,
    required String facilityId,
    required String role,
  }) async {
    await Future.wait([
      _storage.write(key: _kUserId, value: userId),
      _storage.write(key: _kFacilityId, value: facilityId),
      _storage.write(key: _kRole, value: role),
    ]);
  }

  Future<String?> getUserId() => _storage.read(key: _kUserId);
  Future<String?> getFacilityId() => _storage.read(key: _kFacilityId);
  Future<String?> getRole() => _storage.read(key: _kRole);

  /// Parses the stored JWT to extract claims. Only call this after login;
  /// prefer the cached values from [getUserId]/[getFacilityId] in hot paths.
  Future<Map<String, dynamic>?> parseStoredToken() async {
    try {
      final token = await _storage.read(key: _kToken);
      if (token == null) return null;
      return _decodeJwtPayload(token);
    } catch (_) {
      return null;
    }
  }

  /// Returns FHIR Practitioner reference for the logged-in user.
  Future<String> getPractitionerRef() async {
    final userId = await getUserId();
    return 'Practitioner/${userId ?? 'unknown'}';
  }

  /// Clears all user context (on logout).
  Future<void> clearUserContext() async {
    await Future.wait([
      _storage.delete(key: _kUserId),
      _storage.delete(key: _kFacilityId),
      _storage.delete(key: _kRole),
    ]);
  }

  Map<String, dynamic> _decodeJwtPayload(String token) {
    final parts = token.split('.');
    if (parts.length != 3) throw const FormatException('Invalid JWT format');
    final payload = parts[1];
    // Pad Base64 to multiple of 4
    final normalized = base64Url.normalize(payload);
    final decoded = utf8.decode(base64Url.decode(normalized));
    return jsonDecode(decoded) as Map<String, dynamic>;
  }
}
