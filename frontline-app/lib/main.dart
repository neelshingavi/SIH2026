import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'forms/dynamic_form_renderer.dart';
import 'services/triage_service.dart';
import 'models/fhir_models.dart';

void main() {
  runApp(const SetuApp());
}

class SetuApp extends StatelessWidget {
  const SetuApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Setu Frontline',
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('en'),
        Locale('hi'),
        Locale('mr'),
      ],
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.teal),
        useMaterial3: true,
      ),
      home: const DashboardScreen(),
    );
  }
}

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  bool isOnline = false;
  int pendingSyncs = 0;

  // ANC Form Schema
  final ancSchema = {
    "title": "ANC Assessment",
    "fields": [
      {"id": "bp.systolic", "type": "number", "label": "Systolic Blood Pressure (mmHg)", "required": true},
      {"id": "bp.diastolic", "type": "number", "label": "Diastolic Blood Pressure (mmHg)", "required": true},
      {"id": "hemoglobin", "type": "number", "label": "Hemoglobin (g/dL)", "required": true}
    ]
  };

  void _openAncForm() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
          left: 24, right: 24, top: 24
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('ANC Assessment Form', style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 16),
              DynamicFormRenderer(
                schema: ancSchema,
                onSubmit: (data) {
                  Navigator.pop(context);
                  _processAncTriage(data);
                },
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      )
    );
  }

  void _processAncTriage(Map<String, dynamic> data) {
    final triageSvc = TriageService();
    
    List<Observation> obs = [];
    if (data['bp.systolic'] != null) obs.add(Observation(id: '1', patientId: 'p1', code: 'bp.systolic', value: data['bp.systolic']));
    if (data['bp.diastolic'] != null) obs.add(Observation(id: '2', patientId: 'p1', code: 'bp.diastolic', value: data['bp.diastolic']));
    if (data['hemoglobin'] != null) obs.add(Observation(id: '3', patientId: 'p1', code: 'hemoglobin', value: data['hemoglobin']));

    final result = triageSvc.evaluate('ANC', obs);

    // Increment pending syncs to simulate offline storage saving
    setState(() {
      pendingSyncs += 3; // Saved 3 FHIR resources
    });

    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(
          result.riskBand == 'EMERGENCY' ? '🚨 EMERGENCY' : 
          result.riskBand == 'HIGH_RISK' ? '⚠️ HIGH RISK' : '✅ NORMAL'
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Flags Identified:'),
            ...result.flags.map((f) => Text('• $f', style: const TextStyle(fontWeight: FontWeight.bold))),
            const SizedBox(height: 12),
            const Text('Action:'),
            Text(result.recommendedAction, style: const TextStyle(color: Colors.blue, fontWeight: FontWeight.bold)),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('OK'))
        ],
      )
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Setu Frontline'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        actions: [
          Row(
            children: [
              Icon(isOnline ? Icons.wifi : Icons.wifi_off, color: isOnline ? Colors.green : Colors.red),
              Switch(
                value: isOnline,
                onChanged: (val) {
                  setState(() {
                    isOnline = val;
                    if (isOnline && pendingSyncs > 0) {
                      // Simulate sync on connection restore
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Syncing $pendingSyncs pending records...')));
                      Future.delayed(const Duration(seconds: 2), () {
                        setState(() { pendingSyncs = 0; });
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Sync Complete!')));
                      });
                    }
                  });
                },
              ),
            ],
          )
        ],
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            Container(
              padding: const EdgeInsets.all(16),
              margin: const EdgeInsets.only(bottom: 32),
              decoration: BoxDecoration(
                color: pendingSyncs > 0 ? Colors.orange.shade100 : Colors.green.shade100,
                borderRadius: BorderRadius.circular(8)
              ),
              child: Text(
                pendingSyncs > 0 ? '$pendingSyncs Records Pending Sync' : 'All Data Synced',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ),
            ElevatedButton.icon(
              onPressed: () {},
              icon: const Icon(Icons.person_add),
              label: Text(l10n.registerPatient),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: _openAncForm,
              icon: const Icon(Icons.monitor_heart),
              label: const Text("ANC Form (High-Risk Test)"),
            ),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: isOnline ? () {} : null,
              icon: const Icon(Icons.sync),
              label: Text(l10n.syncData),
            )
          ],
        ),
      ),
    );
  }
}
