import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';
import '../../sync/sync_coordinator.dart';
import 'package:frontline_app/db/database.dart';
import 'dart:convert';

class ReferralCreationScreen extends StatefulWidget {
  final String patientId;

  const ReferralCreationScreen({Key? key, required this.patientId}) : super(key: key);

  @override
  _ReferralCreationScreenState createState() => _ReferralCreationScreenState();
}

class _ReferralCreationScreenState extends State<ReferralCreationScreen> {
  String _urgency = 'routine';
  String _reason = '';
  String _destinationFacility = 'FAC-DIST-1';
  bool _isSaving = false;

  void _submitReferral() async {
    setState(() => _isSaving = true);
    try {
      final syncCoordinator = Provider.of<SyncCoordinator>(context, listen: false);
      final uuid = const Uuid();

      // Create FHIR ServiceRequest
      final serviceRequestId = uuid.v4();
      final serviceRequestPayload = {
        'resourceType': 'ServiceRequest',
        'id': serviceRequestId,
        'status': 'active',
        'intent': 'order',
        'priority': _urgency,
        'subject': {'reference': 'Patient/\${widget.patientId}'},
        'reasonCode': [{'text': _reason}],
        'performer': [{'reference': 'Organization/$_destinationFacility'}],
      };

      await syncCoordinator.persistLocally(
        resourceType: 'ServiceRequest',
        id: serviceRequestId,
        jsonPayload: jsonEncode(serviceRequestPayload),
      );

      // Create FHIR Task
      final taskId = uuid.v4();
      final taskPayload = {
        'resourceType': 'Task',
        'id': taskId,
        'status': 'requested',
        'intent': 'order',
        'priority': _urgency,
        'focus': {'reference': 'ServiceRequest/$serviceRequestId'},
        'for': {'reference': 'Patient/\${widget.patientId}'},
        'owner': {'reference': 'Organization/$_destinationFacility'},
        'authoredOn': DateTime.now().toIso8601String(),
      };

      await syncCoordinator.persistLocally(
        resourceType: 'Task',
        id: taskId,
        jsonPayload: jsonEncode(taskPayload),
      );

      // Phase 21/29: Offline Exchange (Triggered by real referral workflow)
      final exchangeRequestId = uuid.v4();
      final exchangePayload = {
        'resourceType': 'CommunicationRequest',
        'id': exchangeRequestId,
        'status': 'draft',
        'priority': _urgency,
        'subject': {'reference': 'Patient/${widget.patientId}'},
        'about': [{'reference': 'ServiceRequest/$serviceRequestId'}],
        'recipient': [{'reference': 'Organization/$_destinationFacility'}],
        'payload': [{'contentString': 'Referral context exchange'}],
        'authoredOn': DateTime.now().toIso8601String(),
        'extension': [{
          'url': 'http://setu.in/fhir/StructureDefinition/exchange-status',
          'valueString': 'EXCHANGE_PENDING'
        }]
      };

      await syncCoordinator.persistLocally(
        resourceType: 'CommunicationRequest',
        id: exchangeRequestId,
        jsonPayload: jsonEncode(exchangePayload),
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Referral created locally. Will sync when online.')));
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Create Referral')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            DropdownButtonFormField<String>(
              value: _urgency,
              decoration: const InputDecoration(labelText: 'Urgency'),
              items: const [
                DropdownMenuItem(value: 'routine', child: Text('Routine')),
                DropdownMenuItem(value: 'urgent', child: Text('Urgent')),
                DropdownMenuItem(value: 'stat', child: Text('Emergency (Stat)')),
              ],
              onChanged: (v) => setState(() => _urgency = v!),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              value: _destinationFacility,
              decoration: const InputDecoration(labelText: 'Destination Facility (Intelligent Routing)'),
              items: const [
                DropdownMenuItem(value: 'FAC-DIST-1', child: Text('District Hospital (Score: 85)')),
                DropdownMenuItem(value: 'FAC-RURAL-1', child: Text('Rural Hospital (Score: 92)')),
              ],
              onChanged: (v) => setState(() => _destinationFacility = v!),
            ),
            const SizedBox(height: 16),
            TextField(
              decoration: const InputDecoration(labelText: 'Clinical Reason'),
              maxLines: 3,
              onChanged: (v) => _reason = v,
            ),
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: _isSaving ? null : _submitReferral,
              child: _isSaving ? const CircularProgressIndicator() : const Text('Submit Referral'),
            ),
          ],
        ),
      ),
    );
  }
}
