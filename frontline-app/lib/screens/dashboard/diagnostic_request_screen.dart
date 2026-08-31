import 'package:flutter/material.dart';
import '../../services/offline_inventory_service.dart';

class DiagnosticRequestScreen extends StatefulWidget {
  final OfflineInventoryService inventoryService;
  final String patientId;
  final String patientName;

  const DiagnosticRequestScreen({
    Key? key, 
    required this.inventoryService, 
    this.patientId = 'P123', 
    this.patientName = 'Jane Doe'
  }) : super(key: key);

  @override
  _DiagnosticRequestScreenState createState() => _DiagnosticRequestScreenState();
}

class _DiagnosticRequestScreenState extends State<DiagnosticRequestScreen> {
  final List<Map<String, String>> tests = [
    {'code': '58410-2', 'name': 'Complete Blood Count (CBC)'},
    {'code': '4544-3', 'name': 'Hematocrit'},
    {'code': '14959-1', 'name': 'Microalbumin'},
    {'code': '2160-0', 'name': 'Creatinine'},
    {'code': '24356-8', 'name': 'Urinalysis'},
    {'code': '249-1', 'name': 'Ultrasound - Obstetric'},
  ];

  Future<void> _requestDiagnostic(String code, String name) async {
    await widget.inventoryService.requestDiagnostic(widget.patientId, widget.patientName, code, name);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Offline Diagnostic Request queued for sync!')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Order Diagnostics')),
      body: ListView.builder(
        itemCount: tests.length,
        itemBuilder: (context, index) {
          final test = tests[index];
          return Card(
            margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            child: ListTile(
              leading: const Icon(Icons.science, color: Colors.purple),
              title: Text(test['name']!),
              subtitle: Text('LOINC: \${test['code']}'),
              trailing: ElevatedButton(
                onPressed: () => _requestDiagnostic(test['code']!, test['name']!),
                child: const Text('Order'),
              ),
            ),
          );
        },
      ),
    );
  }
}
