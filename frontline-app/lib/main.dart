import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:uuid/uuid.dart';
import 'package:http/http.dart' as http;
import 'forms/dynamic_form_renderer.dart';
import 'services/triage_service.dart';
import 'models/fhir_models.dart';
import 'db/database.dart';
import 'repositories/patient_repository.dart';
import 'repositories/encounter_repository.dart';
import 'repositories/observation_repository.dart';
import 'repositories/condition_repository.dart';
import 'services/sync_coordinator.dart';
import 'screens/login_screen.dart';
import 'services/auth_service.dart';

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
      home: const LoginScreen(),
    );
  }
}

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  late final AppDatabase _db;
  late final SyncCoordinator _sync;
  late final PatientRepository _patientRepo;
  late final EncounterRepository _encounterRepo;
  late final ObservationRepository _observationRepo;
  late final ConditionRepository _conditionRepo;

  Timer? _refreshTimer;
  int _pendingCount = 0;

  final String _deviceId = 'device-101';
  final String _facilityId = 'PHC-001';
  final String _practitionerId = 'Practitioner/local-user';

  @override
  void initState() {
    super.initState();
    _db = AppDatabase();
    _sync = SyncCoordinator(_db);
    _patientRepo = PatientRepository(_db);
    _encounterRepo = EncounterRepository(_db);
    _observationRepo = ObservationRepository(_db);
    _conditionRepo = ConditionRepository(_db);

    _sync.startListening();
    _refreshTimer = Timer.periodic(const Duration(seconds: 2), (_) => _refreshStatus());
    _refreshStatus();
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _refreshStatus() async {
    final ops = await _db.getPendingOperations();
    setState(() {
      _pendingCount = ops.length;
    });
  }

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

  Future<void> _processAncTriage(Map<String, dynamic> data) async {
    final triageSvc = TriageService();
    final patientId = const Uuid().v4();
    final encounterId = const Uuid().v4();
    
    List<Observation> obs = [];
    if (data['bp.systolic'] != null) obs.add(Observation(id: const Uuid().v4(), patientId: patientId, code: 'bp.systolic', value: data['bp.systolic']));
    if (data['bp.diastolic'] != null) obs.add(Observation(id: const Uuid().v4(), patientId: patientId, code: 'bp.diastolic', value: data['bp.diastolic']));
    if (data['hemoglobin'] != null) obs.add(Observation(id: const Uuid().v4(), patientId: patientId, code: 'hemoglobin', value: data['hemoglobin']));

    final result = triageSvc.evaluate('ANC', obs);

    // Save actual FHIR resources locally using specific repositories
    await _patientRepo.createPatient(
      id: patientId,
      name: 'Jane Doe',
      createdBy: _practitionerId,
      deviceId: _deviceId,
      facilityId: _facilityId,
    );

    await _encounterRepo.createEncounter(
      id: encounterId,
      patientId: patientId,
      createdBy: _practitionerId,
      deviceId: _deviceId,
      facilityId: _facilityId,
    );

    for (var o in obs) {
      await _observationRepo.createObservation(
        id: o.id,
        patientId: patientId,
        code: o.code,
        value: o.value,
        createdBy: _practitionerId,
        deviceId: _deviceId,
        facilityId: _facilityId,
      );
    }
    
    // Create Condition resource based on triage
    final conditionId = const Uuid().v4();
    await _conditionRepo.createCondition(
      id: conditionId,
      patientId: patientId,
      severity: result.riskBand,
      note: result.recommendedAction,
      createdBy: _practitionerId,
      deviceId: _deviceId,
      facilityId: _facilityId,
    );

    await _refreshStatus();
    _sync.syncNow(); // Auto trigger sync on write

    if (mounted) {
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
              ...result.flags.map((f) => Text('• \$f', style: const TextStyle(fontWeight: FontWeight.bold))),
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
  }

  void _openDiagnostics() {
    Navigator.push(context, MaterialPageRoute(builder: (_) => DiagnosticsScreen(db: _db)));
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Setu Frontline'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_applications),
            onPressed: _openDiagnostics,
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
                color: _pendingCount > 0 ? Colors.orange.shade100 : Colors.green.shade100,
                borderRadius: BorderRadius.circular(8)
              ),
              child: Text(
                _pendingCount > 0 ? '\$_pendingCount Records Pending Sync (Offline)' : '✓ All Records Synchronized',
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
              onPressed: () {
                _sync.syncNow();
                _refreshStatus();
              },
              icon: const Icon(Icons.sync),
              label: Text(l10n.syncData),
            )
          ],
        ),
      ),
    );
  }
}

class DiagnosticsScreen extends StatefulWidget {
  final AppDatabase db;
  const DiagnosticsScreen({super.key, required this.db});

  @override
  State<DiagnosticsScreen> createState() => _DiagnosticsScreenState();
}

class _DiagnosticsScreenState extends State<DiagnosticsScreen> {
  List<SyncOperation> _ops = [];
  bool _isBackendReachable = false;
  int _totalSynced = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final ops = await widget.db.getPendingOperations();
    
    // Check backend reachability manually
    bool reachable = false;
    try {
      final res = await http.get(Uri.parse('http://localhost:3001/health')).timeout(const Duration(seconds: 2));
      reachable = res.statusCode == 200;
    } catch (_) {}

    // Count synced resources
    final syncedList = await (widget.db.select(widget.db.localResources)..where((t) => t.syncStatus.equals('SYNCED'))).get();

    setState(() { 
      _ops = ops; 
      _isBackendReachable = reachable;
      _totalSynced = syncedList.length;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Sync Diagnostics')),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.grey.shade200,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                Column(
                  children: [
                    const Text('Backend', style: TextStyle(fontWeight: FontWeight.bold)),
                    Icon(_isBackendReachable ? Icons.check_circle : Icons.error, color: _isBackendReachable ? Colors.green : Colors.red),
                  ],
                ),
                Column(
                  children: [
                    const Text('Synced', style: TextStyle(fontWeight: FontWeight.bold)),
                    Text('\$_totalSynced', style: const TextStyle(fontSize: 18)),
                  ],
                ),
                Column(
                  children: [
                    const Text('Pending', style: TextStyle(fontWeight: FontWeight.bold)),
                    Text('\${_ops.length}', style: const TextStyle(fontSize: 18)),
                  ],
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView.builder(
              itemCount: _ops.length,
              itemBuilder: (context, index) {
                final op = _ops[index];
                return ListTile(
                  title: Text('\${op.operation} \${op.resourceType}'),
                  subtitle: Text('Status: \${op.status} | Retries: \${op.retryCount}\\nNext Retry: \${op.nextRetryTimestamp}\\nErr: \${op.lastError ?? 'None'}'),
                  trailing: Text(op.idempotencyKey.substring(0, 8)),
                );
              }
            ),
          ),
        ],
      )
    );
  }
}

