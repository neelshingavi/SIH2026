import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:frontline_app/auth/auth_service.dart';

class CareGapDashboardScreen extends StatefulWidget {
  const CareGapDashboardScreen({Key? key}) : super(key: key);

  @override
  _CareGapDashboardScreenState createState() => _CareGapDashboardScreenState();
}

class _CareGapDashboardScreenState extends State<CareGapDashboardScreen> {
  bool _loading = true;
  List<dynamic> _gaps = [];
  String _error = '';

  @override
  void initState() {
    super.initState();
    _fetchCareGaps();
  }

  Future<void> _fetchCareGaps() async {
    setState(() { _loading = true; _error = ''; });
    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final token = await authService.getToken();
      
      final url = Uri.parse('http://localhost:3000/care-gaps/dashboard');
      final response = await http.get(url, headers: {'Authorization': 'Bearer $token'});

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _gaps = data['gaps'] ?? [];
        });
      } else {
        throw Exception('Failed to load care gaps');
      }
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

  Future<void> _resolveGap(Map<String, dynamic> gap) async {
    if (gap['type'] == 'OVERDUE_FOLLOWUP') {
      final authService = Provider.of<AuthService>(context, listen: false);
      final token = await authService.getToken();
      final url = Uri.parse('http://localhost:3000/care-gaps/followup/\${gap['resourceId']}');
      
      await http.patch(
        url, 
        headers: {'Authorization': 'Bearer $token', 'Content-Type': 'application/json'},
        body: jsonEncode({'status': 'COMPLETED', 'notes': 'Resolved via Care Gap Dashboard'}),
      );
      _fetchCareGaps();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Action needed on patient profile.')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final emergencyCount = _gaps.where((g) => g['priority'] == 'EMERGENCY').length;
    final highCount = _gaps.where((g) => g['priority'] == 'HIGH').length;
    final routineCount = _gaps.where((g) => g['priority'] == 'ROUTINE').length;

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
              // Summary Banner
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
                          backgroundColor: _getPriorityColor(gap['priority']),
                          child: Icon(_getTypeIcon(gap['type']), color: Colors.white),
                        ),
                        title: Text('\${gap['type'].replaceAll('_', ' ')}'),
                        subtitle: Text('\${gap['description']}\\nPatient: \${gap['patientId']}'),
                        trailing: gap['type'] == 'OVERDUE_FOLLOWUP'
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
