import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:frontline_app/db/database.dart';
import 'package:provider/provider.dart';

class PatientTimelineScreen extends StatefulWidget {
  final String patientId;

  const PatientTimelineScreen({super.key, required this.patientId});

  @override
  State<PatientTimelineScreen> createState() => _PatientTimelineScreenState();
}

class _PatientTimelineScreenState extends State<PatientTimelineScreen> {
  bool _isLoading = true;
  List<dynamic> _timelineData = [];
  String? _error;
  late final AppDatabase _db;

  @override
  void initState() {
    super.initState();
    _db = Provider.of<AppDatabase>(context, listen: false);
    _fetchTimeline();
  }

  Future<void> _fetchTimeline() async {
    try {
      final records = await (_db.select(_db.localResources)
            ..where((t) => t.isDeleted.equals(false)))
          .get();

      List<dynamic> resources = [];
      for (var r in records) {
        final payload = jsonDecode(r.jsonPayload);
        
        // Filter by patientId
        bool matches = false;
        if (payload['subject']?['reference'] == 'Patient/\${widget.patientId}') matches = true;
        if (payload['patient']?['reference'] == 'Patient/\${widget.patientId}') matches = true;
        if (payload['for']?['reference'] == 'Patient/\${widget.patientId}') matches = true;
        
        if (matches) {
          payload['_updatedAt'] = payload['meta']?['lastUpdated'] ?? r.updatedAt.toIso8601String();
          resources.add(payload);
        }
      }

      // Sort by date descending
      resources.sort((a, b) {
        final da = DateTime.tryParse(a['_updatedAt']) ?? DateTime.now();
        final db = DateTime.tryParse(b['_updatedAt']) ?? DateTime.now();
        return db.compareTo(da);
      });

      setState(() {
        _timelineData = resources;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Error loading timeline: \$e';
        _isLoading = false;
      });
    }
  }

  IconData _getResourceIcon(String type) {
    switch (type) {
      case 'Encounter': return Icons.local_hospital;
      case 'Observation': return Icons.monitor_heart;
      case 'RiskAssessment': return Icons.warning_rounded;
      case 'ServiceRequest': return Icons.send;
      case 'CarePlan': return Icons.assignment;
      case 'Task': return Icons.check_circle_outline;
      case 'Condition': return Icons.healing;
      default: return Icons.medical_information;
    }
  }

  Color _getResourceColor(String type) {
    switch (type) {
      case 'Encounter': return Colors.blue;
      case 'RiskAssessment': return Colors.red;
      case 'ServiceRequest': return Colors.orange;
      case 'CarePlan': return Colors.green;
      default: return Colors.grey;
    }
  }

  String _formatDate(String isoString) {
    final dt = DateTime.tryParse(isoString);
    if (dt == null) return '';
    return '\${dt.day}/\${dt.month} \${dt.hour}:\${dt.minute.toString().padLeft(2, '0')}';
  }

  Widget _buildTimelineItem(dynamic resource, bool isLast) {
    final type = resource['resourceType'] ?? 'Unknown';
    final date = _formatDate(resource['_updatedAt']);
    
    String title = type;
    String subtitle = '';

    if (type == 'RiskAssessment') {
      final prediction = resource['prediction'] as List?;
      if (prediction != null && prediction.isNotEmpty) {
        title = 'Risk: \${prediction[0]['qualitativeRisk']?['text']}';
        subtitle = prediction[0]['rationale'] ?? '';
      }
    } else if (type == 'Observation') {
      title = resource['code'] ?? 'Observation';
      subtitle = 'Value: \${resource['value']}';
    } else if (type == 'ServiceRequest') {
      title = 'Referral Created';
      subtitle = 'Priority: \${resource['priority']}';
    } else if (type == 'CarePlan') {
      title = 'Care Plan Created';
      subtitle = resource['description'] ?? '';
    } else if (type == 'Task') {
      title = 'Follow-up Task';
      subtitle = 'Status: \${resource['status']}';
    } else if (type == 'Condition') {
      title = 'Condition Recorded';
      subtitle = 'Severity: \${resource['severity']}';
    } else if (type == 'Provenance') {
      title = 'Record Imported';
      subtitle = 'Source: \${resource['agent']?[0]?['who']?['reference'] ?? 'External ABDM Gateway'}';
    }

    String sourceTag = 'LOCAL RECORD';
    if (type == 'Provenance') {
      sourceTag = 'IMPORTED RECORD';
    }

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            width: 60,
            child: Padding(
              padding: const EdgeInsets.only(top: 12.0),
              child: Text(date, style: const TextStyle(fontSize: 12, color: Colors.grey), textAlign: TextAlign.right),
            ),
          ),
          const SizedBox(width: 16),
          Column(
            children: [
              Container(
                margin: const EdgeInsets.symmetric(vertical: 8),
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: _getResourceColor(type).withOpacity(0.2),
                  shape: BoxShape.circle,
                ),
                child: Icon(_getResourceIcon(type), size: 16, color: _getResourceColor(type)),
              ),
              if (!isLast)
                Expanded(
                  child: Container(width: 2, color: Colors.grey.shade300),
                )
            ],
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(top: 8.0, bottom: 24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(child: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16))),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: type == 'Provenance' ? Colors.purple.shade50 : Colors.blue.shade50,
                          borderRadius: BorderRadius.circular(4)
                        ),
                        child: Text(sourceTag, style: TextStyle(fontSize: 10, color: type == 'Provenance' ? Colors.purple : Colors.blue, fontWeight: FontWeight.bold)),
                      )
                    ]
                  ),
                  if (subtitle.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 4.0),
                      child: Text(subtitle, style: TextStyle(color: Colors.grey.shade700)),
                    ),
                ],
              ),
            ),
          )
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Patient Timeline')),
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator())
        : _error != null 
          ? Center(child: Text(_error!, style: const TextStyle(color: Colors.red)))
          : _timelineData.isEmpty 
            ? const Center(child: Text('No records found offline.'))
            : ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: _timelineData.length,
                itemBuilder: (context, index) {
                  return _buildTimelineItem(_timelineData[index], index == _timelineData.length - 1);
                },
              ),
    );
  }
}
