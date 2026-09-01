import 'package:flutter/material.dart';

class PatientRegistrationScreen extends StatefulWidget {
  const PatientRegistrationScreen({Key? key}) : super(key: key);

  @override
  _PatientRegistrationScreenState createState() => _PatientRegistrationScreenState();
}

class _PatientRegistrationScreenState extends State<PatientRegistrationScreen> {
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _govIdController = TextEditingController();
  
  bool _isCheckingEligibility = false;
  bool? _isEligible;
  String _schemeStatusMessage = '';

  Future<void> _checkPMJAYEligibility() async {
    if (_govIdController.text.isEmpty) return;

    setState(() {
      _isCheckingEligibility = true;
      _isEligible = null;
    });

    // Mock API call to check ABHA / Ration Card against PMJAY registry
    await Future.delayed(const Duration(seconds: 2));

    setState(() {
      _isCheckingEligibility = false;
      // Mock logic: ID starting with 'ABHA' is eligible
      if (_govIdController.text.toUpperCase().startsWith('ABHA')) {
        _isEligible = true;
        _schemeStatusMessage = 'Patient is eligible for FREE treatment under PMJAY.';
      } else {
        _isEligible = false;
        _schemeStatusMessage = 'No PMJAY coverage found for this ID.';
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Patient Registration')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Full Name',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _govIdController,
              decoration: InputDecoration(
                labelText: 'ABHA ID / Ration Card Number',
                border: const OutlineInputBorder(),
                suffixIcon: IconButton(
                  icon: const Icon(Icons.qr_code_scanner),
                  onPressed: () {
                    // Launch scanner
                  },
                ),
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _isCheckingEligibility ? null : _checkPMJAYEligibility,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue.shade800,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              child: _isCheckingEligibility 
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : const Text('Check PMJAY Eligibility'),
            ),
            const SizedBox(height: 20),
            
            if (_isEligible != null)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: _isEligible! ? Colors.green.shade50 : Colors.orange.shade50,
                  border: Border.all(color: _isEligible! ? Colors.green : Colors.orange),
                  borderRadius: BorderRadius.circular(8)
                ),
                child: Row(
                  children: [
                    Icon(
                      _isEligible! ? Icons.verified : Icons.info_outline, 
                      color: _isEligible! ? Colors.green : Colors.orange,
                      size: 32,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        _schemeStatusMessage,
                        style: TextStyle(
                          color: _isEligible! ? Colors.green.shade800 : Colors.orange.shade900,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              
            const Spacer(),
            ElevatedButton(
              onPressed: () {},
              style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 20)),
              child: const Text('Complete Registration', style: TextStyle(fontSize: 18)),
            ),
          ],
        ),
      ),
    );
  }
}
