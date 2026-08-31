import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:frontline_app/repositories/consent_repository.dart';
import 'package:frontline_app/services/device_service.dart';

class ConsentScreen extends StatefulWidget {
  final String patientId;
  final String purpose;
  final String recipientFacilityName;
  final String recipientFacilityId;

  const ConsentScreen({
    super.key,
    required this.patientId,
    required this.purpose,
    required this.recipientFacilityName,
    required this.recipientFacilityId,
  });

  @override
  State<ConsentScreen> createState() => _ConsentScreenState();
}

class _ConsentScreenState extends State<ConsentScreen> {
  bool _isSaving = false;

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
      
      await repo.recordConsent(
        patientId: widget.patientId,
        purpose: widget.purpose,
        facilityId: widget.recipientFacilityId,
        createdBy: practitionerId,
        deviceId: deviceId,
        operation: 'CREATE',
      );
      
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: \$e')));
        setState(() => _isSaving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Record Consent')),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('WHY IS DATA BEING SHARED?', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey)),
            const SizedBox(height: 8),
            Text(widget.purpose, style: const TextStyle(fontSize: 18)),
            const SizedBox(height: 24),
            
            const Text('WHAT WILL BE SHARED?', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey)),
            const SizedBox(height: 8),
            const Text('• Clinical Summary\\n• Recent Observations\\n• Relevant Reports', style: TextStyle(fontSize: 18)),
            const SizedBox(height: 24),
            
            const Text('WHO WILL RECEIVE IT?', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey)),
            const SizedBox(height: 8),
            Text(widget.recipientFacilityName, style: const TextStyle(fontSize: 18)),
            const SizedBox(height: 24),

            const Text('HOW LONG?', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey)),
            const SizedBox(height: 8),
            const Text('Until consultation is completed', style: TextStyle(fontSize: 18)),
            const Spacer(),
            
            if (_isSaving)
              const Center(child: CircularProgressIndicator())
            else
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => _recordConsent(false),
                      style: OutlinedButton.styleFrom(padding: const EdgeInsets.all(16)),
                      child: const Text('DECLINE', style: TextStyle(color: Colors.red)),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () => _recordConsent(true),
                      style: ElevatedButton.styleFrom(padding: const EdgeInsets.all(16), backgroundColor: Colors.green),
                      child: const Text('ALLOW'),
                    ),
                  ),
                ],
              )
          ],
        ),
      ),
    );
  }
}
