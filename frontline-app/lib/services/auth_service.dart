import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import '../config/env.dart';

class AuthService {
  final _storage = const FlutterSecureStorage();
  // Use AppConfig instead of hardcoded string
  final String _baseUrl = AppConfig.authUrl;

  Future<bool> login(String username, String password) async {
    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'username': username, 'password': password}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final token = data['access_token'];
        final facilityId = data['facilityId'];
        if (token != null) {
          await _storage.write(key: 'jwt_token', value: token);
          if (facilityId != null) {
            await _storage.write(key: 'facility_id', value: facilityId);
          }
          return true;
        }
      }
      return false;
    } catch (e) {
      print('Login error: \$e');
      return false;
    }
  }

  Future<void> logout() async {
    await _storage.delete(key: 'jwt_token');
    await _storage.delete(key: 'facility_id');
  }

  Future<String?> getToken() async {
    return await _storage.read(key: 'jwt_token');
  }

  Future<String?> getFacilityId() async {
    return await _storage.read(key: 'facility_id');
  }

  Future<bool> isLoggedIn() async {
    final token = await getToken();
    return token != null;
  }
}
