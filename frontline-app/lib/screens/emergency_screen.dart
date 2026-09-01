import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class EmergencyScreen extends StatelessWidget {
  const EmergencyScreen({Key? key}) : super(key: key);

  /// Triggers the native dialer intent to call emergency services
  Future<void> _callEmergencyServices() async {
    final Uri phoneUri = Uri(
      scheme: 'tel',
      path: '108', // Indian Ambulance Service
    );
    if (await canLaunchUrl(phoneUri)) {
      await launchUrl(phoneUri);
    } else {
      debugPrint('Could not launch dialer for 108');
    }
  }

  /// Triggers a pre-filled SMS with GPS coords (mocked) to dispatch
  Future<void> _sendEmergencySMS() async {
    final Uri smsUri = Uri(
      scheme: 'sms',
      path: '108',
      queryParameters: <String, String>{
        'body': 'EMERGENCY: STAT Referral SLA Breached. Location: PHC Ramgarh (Lat: 28.53, Lng: 77.39). Patient Severity: RED.',
      },
    );
    if (await canLaunchUrl(smsUri)) {
      await launchUrl(smsUri);
    } else {
      debugPrint('Could not launch SMS');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Emergency Protocols', style: TextStyle(color: Colors.white)),
        backgroundColor: Colors.red.shade800,
      ),
      backgroundColor: Colors.red.shade50,
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'OFFLINE EMERGENCY PROTOCOLS',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.red),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            
            // Offline Protocols Section
            Card(
              elevation: 4,
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text('1. Stabilize Patient', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                    Text('Ensure airway is clear, control any active bleeding. Administer O2 if available.'),
                    SizedBox(height: 10),
                    Text('2. Prepare for Transport', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                    Text('Ensure all patient records are collected. Inform next of kin.'),
                  ],
                ),
              ),
            ),
            const Spacer(),
            
            // Action Buttons
            ElevatedButton.icon(
              onPressed: _callEmergencyServices,
              icon: const Icon(Icons.phone),
              label: const Text('CALL 108 (AMBULANCE)'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red.shade700,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 20),
                textStyle: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: _sendEmergencySMS,
              icon: const Icon(Icons.sms),
              label: const Text('SEND SOS SMS TO DISPATCH'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.orange.shade800,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 20),
                textStyle: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ),
            const SizedBox(height: 30),
          ],
        ),
      ),
    );
  }
}
