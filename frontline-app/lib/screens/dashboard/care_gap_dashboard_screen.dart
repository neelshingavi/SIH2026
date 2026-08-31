import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:frontline_app/db/database.dart';
import 'package:frontline_app/services/care_gap_service.dart';
import 'package:frontline_app/services/sync_coordinator.dart';
import 'package:frontline_app/services/auth_service.dart';

class CareGapDashboardScreen extends StatefulWidget {
  final AppDatabase db;
  final SyncCoordinator syncCoordinator;

  const CareGapDashboardScreen({
    Key? key,
    required this.db,
    required this.syncCoordinator,
  }) : super(key: key);

  @override
  _CareGapDashboardScreenState createState() => _CareGapDashboardScreenState();
}

class _CareGapDashboardScreenState extends State<CareGapDashboardScreen> {
  bool _loading = true;
  List<CareGap> _gaps = [];
  String _error = '';
  late final CareGapLocalService _service;
  
  String _facilityId = '';

  @override
  void initState() {
    super.initState();
    _service = CareGapLocalService(widget.db);
    _initializeFacilityAndFetchGaps();
  }

  Future<void> _initializeFacilityAndFetchGaps() async {
    final authService = Provider.of<AuthService>(context, listen: false);
    final facilityId = await authService.getFacilityId();
    _facilityId = facilityId ?? 'UNKNOWN';
    await _fetchCareGaps();
  }

  Future<void> _fetchCareGaps() async {
    setState(() { _loading = true; _error = ''; });
    try {
      final gaps = await _service.getLocalDashboard(_facilityId);
      setState(() {
        _gaps = gaps;
      });
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  Color _getPriorityColor(String priority) {
    switch (priority) {
      case 'EMERGENCY': return Colors.red;
      case 'HIGH': return Colors.orange;
      default: return Colors.amber;
    }
  }

  IconData _getTypeIcon(String type) {
    switch (type) {
      case 'UNRESOLVED_RISK': return Icons.warning_amber_rounded;
      case 'STALLED_REFERRAL': return Icons.hourglass_bottom;
      case 'OVERDUE_FOLLOWUP': return Icons.directions_walk;
      default: return Icons.info;
    }
  }

  Future<void> _resolveGap(CareGap gap) async {
    if (gap.type == 'OVERDUE_FOLLOWUP') {
      try {
        final record = await (widget.db.select(widget.db.localResources)
            ..where((t) => t.id.equals(gap.resourceId))).getSingleOrNull();

        if (record != null) {
          final cp = jsonDecode(record.jsonPayload);
          cp['status'] = 'completed'; // For demo, completing the CarePlan itself, or resolving the Task
          
          await widget.db.update(widget.db.localResources).replace(
            record.copyWith(
              jsonPayload: jsonEncode(cp),
              syncStatus: 'PENDING',
              updatedAt: DateTime.now(),
            )
          );

          await widget.db.into(widget.db.syncOperations).insert(
            SyncOperationsCompanion.insert(
              id: DateTime.now().millisecondsSinceEpoch.toString(),
              resourceId: record.id,
              resourceType: record.resourceType,
              operation: 'UPDATE',
              idempotencyKey: DateTime.now().millisecondsSinceEpoch.toString(),
            )
          );

          widget.syncCoordinator.syncNow();
          _fetchCareGaps();
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Follow-up resolved locally and queued for sync.')));
          }
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to resolve: \$e')));
        }
      }
    } else {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Action needed on patient profile.')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final emergencyCount = _gaps.where((g) => g.priority == 'EMERGENCY').length;
    final highCount = _gaps.where((g) => g.priority == 'HIGH').length;
    final routineCount = _gaps.where((g) => g.priority == 'ROUTINE').length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Care Gaps'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _fetchCareGaps),
        ],
      ),
      body: _loading 
        ? const Center(child: CircularProgressIndicator())
        : _error.isNotEmpty
          ? Center(child: Text(_error, style: const TextStyle(color: Colors.red)))
          : Column(
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                color: Colors.blue.shade50,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _buildSummaryItem('Emergency', emergencyCount, Colors.red),
                    _buildSummaryItem('High Risk', highCount, Colors.orange),
                    _buildSummaryItem('Due Soon', routineCount, Colors.amber),
                  ],
                ),
              ),
              Expanded(
                child: ListView.builder(
                  itemCount: _gaps.length,
                  itemBuilder: (context, index) {
                    final gap = _gaps[index];
                    return Card(
                      margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: _getPriorityColor(gap.priority),
                          child: Icon(_getTypeIcon(gap.type), color: Colors.white),
                        ),
                        title: Text(gap.type.replaceAll('_', ' ')),
                        subtitle: Text('\${gap.description}\\nPatient: \${gap.patientId}'),
                        trailing: gap.type == 'OVERDUE_FOLLOWUP'
                            ? TextButton(onPressed: () => _resolveGap(gap), child: const Text('RESOLVE'))
                            : const Icon(Icons.chevron_right),
                        isThreeLine: true,
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
    );
  }

  Widget _buildSummaryItem(String label, int count, Color color) {
    return Column(
      children: [
        Text(count.toString(), style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: color)),
        Text(label, style: const TextStyle(fontSize: 12)),
      ],
    );
  }
}
