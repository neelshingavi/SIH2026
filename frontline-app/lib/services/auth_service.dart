import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import '../config/env.dart';
import 'device_service.dart';

class AuthService {
  final FlutterSecureStorage _storage;
  final DeviceService _deviceService;
  final String _baseUrl;

  AuthService({
    FlutterSecureStorage? storage,
    DeviceService? deviceService,
  })  : _storage = storage ?? const FlutterSecureStorage(),
        _deviceService = deviceService ?? DeviceService(),
        _baseUrl = AppConfig.authUrl;

  Future<bool> login(String username, String password) async {
    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'username': username, 'password': password}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        final token = data['access_token'] as String?;
        final facilityId = data['facilityId'] as String?;

        if (token != null) {
          await _storage.write(key: 'jwt_token', value: token);

          // Parse JWT to extract userId, role, facilityId
          try {
            final claims = _decodeJwtPayload(token);
            final userId = (claims['sub'] ?? claims['userId'] ?? '') as String;
            final role = (claims['role'] ?? 'UNKNOWN') as String;
            final claimFacilityId =
                facilityId ?? (claims['facilityId'] ?? '') as String;

            await _deviceService.storeUserContext(
              userId: userId,
              facilityId: claimFacilityId,
              role: role,
            );

            if (claimFacilityId.isNotEmpty) {
              await _storage.write(key: 'facility_id', value: claimFacilityId);
            }
          } catch (_) {
            // If JWT parse fails, store facilityId from response body
            if (facilityId != null) {
              await _storage.write(key: 'facility_id', value: facilityId);
            }
          }
          return true;
        }
      }
      return false;
    } catch (e) {
      // Log structured error without printing raw stack traces
      return false;
    }
  }

  Future<void> logout() async {
    await Future.wait([
      _storage.delete(key: 'jwt_token'),
      _storage.delete(key: 'facility_id'),
    ]);
    await _deviceService.clearUserContext();
  }

  Future<String?> getToken() async => _storage.read(key: 'jwt_token');

  Future<String?> getFacilityId() async => _storage.read(key: 'facility_id');

  Future<bool> isLoggedIn() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }

  Map<String, dynamic> _decodeJwtPayload(String token) {
    final parts = token.split('.');
    if (parts.length != 3) throw const FormatException('Invalid JWT');
    final normalized = base64Url.normalize(parts[1]);
    final decoded = utf8.decode(base64Url.decode(normalized));
    return jsonDecode(decoded) as Map<String, dynamic>;
  }
}
