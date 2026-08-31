import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:uuid/uuid.dart';
import '../services/auth_service.dart';

class PatientTimelineScreen extends StatefulWidget {
  final String patientId;

  const PatientTimelineScreen({super.key, required this.patientId});

  @override
  State<PatientTimelineScreen> createState() => _PatientTimelineScreenState();
}

class _PatientTimelineScreenState extends State<PatientTimelineScreen> {
  final _auth = AuthService();
  bool _isLoading = true;
  List<dynamic> _timelineData = [];
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchTimeline();
  }

  Future<void> _fetchTimeline() async {
    final token = await _auth.getToken();
    if (token == null) {
      setState(() {
        _error = 'Not authenticated';
        _isLoading = false;
      });
      return;
    }

    final requestId = const Uuid().v4();

    try {
      final response = await http.get(
        Uri.parse('http://localhost:3001/patient/\${widget.patientId}/history'),
        headers: {
          'Authorization': 'Bearer \$token',
          'X-Request-ID': requestId,
        },
      );

      if (response.statusCode == 200) {
        final bundle = jsonDecode(response.body);
        final entry = bundle['entry'] as List<dynamic>? ?? [];
        
        setState(() {
          _timelineData = entry.map((e) => e['resource']).toList();
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = 'Failed to load timeline: \${response.statusCode}';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Error loading timeline: \$e';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Patient Timeline')),
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator())
        : _error != null 
          ? Center(child: Text(_error!, style: const TextStyle(color: Colors.red)))
          : ListView.builder(
              itemCount: _timelineData.length,
              itemBuilder: (context, index) {
                final resource = _timelineData[index];
                return ListTile(
                  leading: const Icon(Icons.medical_information),
                  title: Text(resource['resourceType'] ?? 'Unknown Resource'),
                  subtitle: Text(resource['id'] ?? ''),
                );
              },
            ),
    );
  }
}
