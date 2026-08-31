import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:frontline_app/repositories/consent_repository.dart';
import 'package:frontline_app/services/device_service.dart';

/// Phase 7 (Phase 7 spec item "PHASE 7 — HUMAN CONSENT UX"):
/// Displays WHY / WHAT / WHO / HOW LONG clearly, then ALLOW / DECLINE.
/// Phase 32: After successful consent, shows a receipt.
/// Phase 8: Records LOCAL CONSENT and clearly marks it as not yet CENTRALLY verified.
class ConsentScreen extends StatefulWidget {
  final String patientId;
  final String purpose;
  final String recipientFacilityName;
  final String recipientFacilityId;
  /// Optional: which resource types will be shared (Phase 6)
  final List<String>? resourceScope;

  const ConsentScreen({
    super.key,
    required this.patientId,
    required this.purpose,
    required this.recipientFacilityName,
    required this.recipientFacilityId,
    this.resourceScope,
  });

  @override
  State<ConsentScreen> createState() => _ConsentScreenState();
}

class _ConsentScreenState extends State<ConsentScreen> {
  bool _isSaving = false;
  bool _consentGranted = false;
  String? _consentId;

  // Phase 8: Map purpose code to human-readable label
  String _purposeLabel(String code) {
    switch (code.toUpperCase()) {
      case 'TREAT': return 'Treatment & Care';
      case 'REFERRAL': return 'Specialist Referral';
      case 'DIAGNOSTICS': return 'Diagnostic Review';
      case 'MEDICATION': return 'Medication Management';
      case 'TELECONSULT': return 'Teleconsultation';
      case 'FOLLOW_UP': return 'Follow-up Care';
      case 'EMERGENCY': return 'Emergency Access';
      default: return code;
    }
  }

  List<String> get _defaultScope => [
    'Clinical Summary',
    'Recent Observations (BP, Hemoglobin)',
    'Risk Assessment',
    'Active Care Plan',
    'Referral Details',
  ];

  Future<void> _recordConsent(bool isAllowed) async {
    if (!isAllowed) {
      Navigator.pop(context, false);
      return;
    }

    setState(() => _isSaving = true);
    try {
      final deviceService = Provider.of<DeviceService>(context, listen: false);
      final repo = Provider.of<ConsentRepository>(context, listen: false);

      final deviceId = await deviceService.getDeviceId();
      final practitionerId = await deviceService.getPractitionerRef();

      final cId = 'Consent-${DateTime.now().millisecondsSinceEpoch}';
      await repo.recordConsent(
        patientId: widget.patientId,
        purpose: widget.purpose,
        facilityId: widget.recipientFacilityId,
        createdBy: practitionerId,
        deviceId: deviceId,
        operation: 'CREATE',
      );

      setState(() {
        _isSaving = false;
        _consentGranted = true;
        _consentId = cId;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
        setState(() => _isSaving = false);
      }
    }
  }

  // Phase 32: Exchange Receipt screen shown after consent granted
  Widget _buildReceipt() {
    final now = DateTime.now();
    final timeStr = '${now.hour.toString().padLeft(2,'0')}:${now.minute.toString().padLeft(2,'0')} IST';

    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.check_circle, color: Colors.green, size: 48),
          const SizedBox(height: 16),
          const Text('CONSENT RECORDED', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          // Phase 8: Explicitly distinguish LOCAL vs CENTRAL consent
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.orange.shade50,
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: Colors.orange.shade200),
            ),
            child: const Text(
              '⚠ LOCAL CONSENT RECORDED — Pending central sync',
              style: TextStyle(fontSize: 11, color: Colors.deepOrange, fontWeight: FontWeight.w600),
            ),
          ),
          const Divider(height: 32),
          _receiptRow('Recipient', widget.recipientFacilityName),
          _receiptRow('Purpose', _purposeLabel(widget.purpose)),
          _receiptRow('Records', (widget.resourceScope ?? _defaultScope).length.toString()),
          _receiptRow('Time', timeStr),
          if (_consentId != null)
            _receiptRow('Reference', _consentId!.length > 16 ? _consentId!.substring(0, 16).toUpperCase() : _consentId!),
          const Spacer(),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () => Navigator.pop(context, true),
              style: ElevatedButton.styleFrom(padding: const EdgeInsets.all(16)),
              child: const Text('DONE'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _receiptRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.grey, fontWeight: FontWeight.w600)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_consentGranted) return Scaffold(appBar: AppBar(title: const Text('Consent Receipt')), body: _buildReceipt());

    final scopeItems = widget.resourceScope ?? _defaultScope;

    return Scaffold(
      appBar: AppBar(title: const Text('Consent for Data Sharing')),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // WHY
            _sectionHeader('WHY IS DATA BEING SHARED?'),
            const SizedBox(height: 8),
            Text(_purposeLabel(widget.purpose), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
            const SizedBox(height: 24),

            // WHAT
            _sectionHeader('WHAT WILL BE SHARED?'),
            const SizedBox(height: 8),
            ...scopeItems.map((item) => Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Row(
                children: [
                  const Icon(Icons.circle, size: 8, color: Colors.teal),
                  const SizedBox(width: 8),
                  Text(item, style: const TextStyle(fontSize: 15)),
                ],
              ),
            )),
            const SizedBox(height: 24),

            // WHO
            _sectionHeader('WHO WILL RECEIVE IT?'),
            const SizedBox(height: 8),
            Text(widget.recipientFacilityName, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
            const SizedBox(height: 24),

            // HOW LONG
            _sectionHeader('HOW LONG?'),
            const SizedBox(height: 8),
            const Text('Until consultation is completed (7 days max)', style: TextStyle(fontSize: 15)),
            const Spacer(),

            if (_isSaving)
              const Center(child: CircularProgressIndicator())
            else
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => _recordConsent(false),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.all(16),
                        side: const BorderSide(color: Colors.red),
                      ),
                      child: const Text('DECLINE', style: TextStyle(color: Colors.red, fontSize: 16)),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () => _recordConsent(true),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.all(16),
                        backgroundColor: Colors.green,
                        foregroundColor: Colors.white,
                      ),
                      child: const Text('ALLOW', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }

  Widget _sectionHeader(String text) {
    return Text(text, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.grey, fontSize: 12, letterSpacing: 1.0));
  }
}
