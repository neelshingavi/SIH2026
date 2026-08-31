import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:frontline_app/db/database.dart';
import 'package:provider/provider.dart';

/// Phase 18: Patient Timeline distinguishes LOCAL, SHARED, and IMPORTED records.
/// Phase 33: Unified patient view — Setu records + imported + shared.
/// Phase 4: Shows ABHA linkage status and identity verification state.
class PatientTimelineScreen extends StatefulWidget {
  final String patientId;
  final String? patientName;

  const PatientTimelineScreen({
    super.key,
    required this.patientId,
    this.patientName,
  });

  @override
  State<PatientTimelineScreen> createState() => _PatientTimelineScreenState();
}

class _PatientTimelineScreenState extends State<PatientTimelineScreen> {
  bool _isLoading = true;
  List<dynamic> _timelineData = [];
  String? _error;
  late final AppDatabase _db;
  
  // Phase 4: Identity state — in real system, fetched from gateway
  String _abhaStatus = 'NOT_LINKED';
  String _identityVerificationState = 'LOCAL_ONLY';

  @override
  void initState() {
    super.initState();
    _db = Provider.of<AppDatabase>(context, listen: false);
    _fetchTimeline();
  }

  // Phase 4: Determine ABHA linkage from local Patient FHIR resource
  Future<void> _detectAbhaStatus(List<dynamic> resources) async {
    final patientResources = resources.where((r) => r['resourceType'] == 'Patient').toList();
    if (patientResources.isNotEmpty) {
      final identifiers = patientResources.first['identifier'] as List?;
      if (identifiers != null) {
        final hasAbha = identifiers.any((id) =>
            id['system'] == 'https://ndhm.gov.in/abha' ||
            id['system']?.toString().contains('abha') == true);
        setState(() {
          _abhaStatus = hasAbha ? 'LINKED' : 'NOT_LINKED';
          _identityVerificationState = hasAbha ? 'VERIFIED' : 'LOCAL_ONLY';
        });
      }
    }
  }

  Future<void> _fetchTimeline() async {
    try {
      final records = await (_db.select(_db.localResources)
            ..where((t) => t.isDeleted.equals(false)))
          .get();

      List<dynamic> resources = [];
      for (var r in records) {
        final payload = jsonDecode(r.jsonPayload);

        bool matches = false;
        if (payload['subject']?['reference'] == 'Patient/${widget.patientId}') matches = true;
        if (payload['patient']?['reference'] == 'Patient/${widget.patientId}') matches = true;
        if (payload['for']?['reference'] == 'Patient/${widget.patientId}') matches = true;
        if (payload['resourceType'] == 'Patient' && payload['id'] == widget.patientId) matches = true;

        if (matches) {
          // Phase 18: Determine record source
          payload['_updatedAt'] = payload['meta']?['lastUpdated'] ?? r.updatedAt.toIso8601String();
          payload['_syncStatus'] = r.syncStatus; // 'PENDING', 'SYNCED', 'FAILED'
          resources.add(payload);
        }
      }

      resources.sort((a, b) {
        final da = DateTime.tryParse(a['_updatedAt']) ?? DateTime.now();
        final db = DateTime.tryParse(b['_updatedAt']) ?? DateTime.now();
        return db.compareTo(da);
      });

      await _detectAbhaStatus(resources);

      setState(() {
        _timelineData = resources.where((r) => r['resourceType'] != 'Patient').toList();
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Error loading timeline: $e';
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
      case 'Consent': return Icons.verified_user;
      case 'Provenance': return Icons.cloud_download;
      case 'DiagnosticReport': return Icons.science;
      case 'MedicationRequest': return Icons.medication;
      default: return Icons.medical_information;
    }
  }

  Color _getResourceColor(String type) {
    switch (type) {
      case 'Encounter': return Colors.blue;
      case 'RiskAssessment': return Colors.red;
      case 'ServiceRequest': return Colors.orange;
      case 'CarePlan': return Colors.green;
      case 'Consent': return Colors.teal;
      case 'Provenance': return Colors.purple;
      case 'DiagnosticReport': return Colors.indigo;
      case 'MedicationRequest': return Colors.deepOrange;
      default: return Colors.grey;
    }
  }

  // Phase 18: Determine source tag based on resource type and sync status
  String _getSourceTag(dynamic resource) {
    final type = resource['resourceType'] ?? '';
    // IMPORTED: came from external exchange (has Provenance with external agent)
    if (type == 'Provenance') return 'IMPORTED RECORD';
    // SHARED: was exported to another facility (AuditEvent with RECORD_EXPORTED action)
    final auditAction = resource['action'];
    if (auditAction == 'RECORD_EXPORTED') return 'SHARED RECORD';
    // LOCAL: created by this facility's worker
    return 'LOCAL RECORD';
  }

  Color _getSourceTagColor(String tag) {
    switch (tag) {
      case 'IMPORTED RECORD': return Colors.purple;
      case 'SHARED RECORD': return Colors.teal;
      default: return Colors.blue;
    }
  }

  Color _getSourceTagBg(String tag) {
    switch (tag) {
      case 'IMPORTED RECORD': return Colors.purple.shade50;
      case 'SHARED RECORD': return Colors.teal.shade50;
      default: return Colors.blue.shade50;
    }
  }

  String _formatDate(String isoString) {
    final dt = DateTime.tryParse(isoString);
    if (dt == null) return '';
    return '${dt.day}/${dt.month} ${dt.hour}:${dt.minute.toString().padLeft(2, '0')}';
  }

  // Phase 4: Identity Badge widget
  Widget _buildIdentityHeader() {
    final abhaColor = _abhaStatus == 'LINKED' ? Colors.teal : Colors.grey.shade600;
    final abhaIcon = _abhaStatus == 'LINKED' ? Icons.link : Icons.link_off;

    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [BoxShadow(color: Colors.grey.shade100, blurRadius: 8, offset: const Offset(0, 2))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            widget.patientName ?? 'Patient',
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              const Text('Setu ID: ', style: TextStyle(color: Colors.grey, fontSize: 12)),
              Text(
                widget.patientId.length > 12 
                    ? 'SETU-${widget.patientId.substring(0, 8).toUpperCase()}...'
                    : widget.patientId,
                style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Icon(abhaIcon, size: 16, color: abhaColor),
              const SizedBox(width: 4),
              Text(
                'ABHA: ${_abhaStatus == 'LINKED' ? 'Linked' : 'Not Linked'}',
                style: TextStyle(color: abhaColor, fontSize: 13, fontWeight: FontWeight.w600),
              ),
              const SizedBox(width: 16),
              Icon(Icons.shield_outlined, size: 16, color: Colors.grey.shade600),
              const SizedBox(width: 4),
              Text(
                'Identity: ${_identityVerificationState == 'VERIFIED' ? 'Verified' : 'Verified Locally'}',
                style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTimelineItem(dynamic resource, bool isLast) {
    final type = resource['resourceType'] ?? 'Unknown';
    final date = _formatDate(resource['_updatedAt']);
    final sourceTag = _getSourceTag(resource);

    String title = type;
    String subtitle = '';

    if (type == 'RiskAssessment') {
      final prediction = resource['prediction'] as List?;
      if (prediction != null && prediction.isNotEmpty) {
        title = 'Risk: ${prediction[0]['qualitativeRisk']?['text']}';
        subtitle = prediction[0]['rationale'] ?? '';
      }
    } else if (type == 'Observation') {
      title = resource['code']?['text'] ?? resource['code'] ?? 'Observation';
      subtitle = 'Value: ${resource['valueQuantity']?['value'] ?? resource['value']}';
    } else if (type == 'ServiceRequest') {
      title = 'Referral Created';
      subtitle = 'Priority: ${resource['priority']}';
    } else if (type == 'CarePlan') {
      title = 'Care Plan Created';
      subtitle = resource['description'] ?? '';
    } else if (type == 'Task') {
      title = 'Follow-up Task';
      subtitle = 'Status: ${resource['status']}';
    } else if (type == 'Condition') {
      title = resource['code']?['text'] ?? 'Condition Recorded';
      subtitle = 'Clinical Status: ${resource['clinicalStatus']?['coding']?[0]?['code'] ?? ''}';
    } else if (type == 'Provenance') {
      title = 'Record Imported';
      subtitle = 'Source: ${resource['agent']?[0]?['who']?['reference'] ?? 'External HIE'}';
    } else if (type == 'Consent') {
      title = 'Consent Recorded';
      subtitle = 'Purpose: ${resource['provision']?['purpose']?[0]?['code'] ?? ''}';
    } else if (type == 'DiagnosticReport') {
      title = 'Diagnostic Report';
      subtitle = 'Status: ${resource['status']}';
    } else if (type == 'MedicationRequest') {
      title = 'Medication Requested';
      subtitle = resource['medicationCodeableConcept']?['text'] ?? '';
    }

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            width: 60,
            child: Padding(
              padding: const EdgeInsets.only(top: 12.0),
              child: Text(date, style: const TextStyle(fontSize: 11, color: Colors.grey), textAlign: TextAlign.right),
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
                      Expanded(child: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15))),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: _getSourceTagBg(sourceTag),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          sourceTag,
                          style: TextStyle(fontSize: 9, color: _getSourceTagColor(sourceTag), fontWeight: FontWeight.bold),
                        ),
                      )
                    ],
                  ),
                  if (subtitle.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 4.0),
                      child: Text(subtitle, style: TextStyle(color: Colors.grey.shade700, fontSize: 13)),
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
      appBar: AppBar(title: Text(widget.patientName != null ? '${widget.patientName} — Timeline' : 'Patient Timeline')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: Colors.red)))
              : Column(
                  children: [
                    // Phase 4: ABHA Identity Header
                    _buildIdentityHeader(),
                    // Phase 33: Timeline legend
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                      child: Row(
                        children: [
                          _legendChip('LOCAL RECORD', Colors.blue),
                          const SizedBox(width: 8),
                          _legendChip('IMPORTED RECORD', Colors.purple),
                          const SizedBox(width: 8),
                          _legendChip('SHARED RECORD', Colors.teal),
                        ],
                      ),
                    ),
                    Expanded(
                      child: _timelineData.isEmpty
                          ? const Center(child: Text('No records found.'))
                          : ListView.builder(
                              padding: const EdgeInsets.all(16),
                              itemCount: _timelineData.length,
                              itemBuilder: (context, index) {
                                return _buildTimelineItem(_timelineData[index], index == _timelineData.length - 1);
                              },
                            ),
                    ),
                  ],
                ),
    );
  }

  Widget _legendChip(String label, Color color) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 4),
        Text(label, style: TextStyle(fontSize: 10, color: color, fontWeight: FontWeight.bold)),
      ],
    );
  }
}
