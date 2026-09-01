import 'package:flutter/material.dart';

/// A mock FHIR Appointment/Encounter representation for the Queue
class QueueEntry {
  final String patientName;
  final String appointmentId;
  final String triageSeverity; // 'RED', 'YELLOW', 'GREEN'
  final DateTime scheduledTime;
  final String status; // 'booked', 'arrived', 'fulfilled'

  QueueEntry({
    required this.patientName,
    required this.appointmentId,
    required this.triageSeverity,
    required this.scheduledTime,
    required this.status,
  });
}

class QueueScreen extends StatefulWidget {
  const QueueScreen({Key? key}) : super(key: key);

  @override
  _QueueScreenState createState() => _QueueScreenState();
}

class _QueueScreenState extends State<QueueScreen> {
  // In a real implementation, this would be populated by a Stream from the local DB
  // or via WebSockets connected to the core-gateway.
  List<QueueEntry> _queue = [
    QueueEntry(
      patientName: "Aarav Singh",
      appointmentId: "apt-1",
      triageSeverity: "RED",
      scheduledTime: DateTime.now().subtract(const Duration(minutes: 10)),
      status: "arrived",
    ),
    QueueEntry(
      patientName: "Sunita Devi",
      appointmentId: "apt-2",
      triageSeverity: "YELLOW",
      scheduledTime: DateTime.now().add(const Duration(minutes: 5)),
      status: "arrived",
    ),
    QueueEntry(
      patientName: "Rohan Patel",
      appointmentId: "apt-3",
      triageSeverity: "GREEN",
      scheduledTime: DateTime.now().add(const Duration(minutes: 30)),
      status: "booked",
    ),
  ];

  @override
  void initState() {
    super.initState();
    _sortQueue();
  }

  void _sortQueue() {
    // Sort by Triage Severity (RED > YELLOW > GREEN) rather than just FIFO
    int getSeverityScore(String severity) {
      switch (severity) {
        case 'RED': return 3;
        case 'YELLOW': return 2;
        case 'GREEN': return 1;
        default: return 0;
      }
    }
    
    setState(() {
      _queue.sort((a, b) {
        final scoreA = getSeverityScore(a.triageSeverity);
        final scoreB = getSeverityScore(b.triageSeverity);
        if (scoreA != scoreB) {
          return scoreB.compareTo(scoreA); // Descending order of severity
        }
        // If severity is the same, sort by time (FIFO)
        return a.scheduledTime.compareTo(b.scheduledTime);
      });
    });
  }

  Color _getTriageColor(String severity) {
    switch (severity) {
      case 'RED': return Colors.red.shade100;
      case 'YELLOW': return Colors.orange.shade100;
      case 'GREEN': return Colors.green.shade100;
      default: return Colors.grey.shade100;
    }
  }

  IconData _getTriageIcon(String severity) {
    switch (severity) {
      case 'RED': return Icons.warning_amber_rounded;
      case 'YELLOW': return Icons.info_outline;
      case 'GREEN': return Icons.check_circle_outline;
      default: return Icons.person;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Patient Queue (Triage-Sorted)'),
      ),
      body: ListView.builder(
        itemCount: _queue.length,
        padding: const EdgeInsets.all(8.0),
        itemBuilder: (context, index) {
          final entry = _queue[index];
          return Card(
            color: _getTriageColor(entry.triageSeverity),
            child: ListTile(
              leading: Icon(_getTriageIcon(entry.triageSeverity), size: 36),
              title: Text(entry.patientName, style: const TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Text('Status: ${entry.status.toUpperCase()} | Time: ${entry.scheduledTime.hour}:${entry.scheduledTime.minute.toString().padLeft(2, '0')}'),
              trailing: ElevatedButton(
                onPressed: () {
                  // Connects to the encounter/triage form
                },
                child: const Text('Start Encounter'),
              ),
            ),
          );
        },
      ),
    );
  }
}
