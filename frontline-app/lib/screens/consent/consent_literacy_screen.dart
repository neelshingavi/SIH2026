import 'package:flutter/material.dart';
import 'package:flutter_tts/flutter_tts.dart';

class ConsentLiteracyScreen extends StatefulWidget {
  const ConsentLiteracyScreen({Key? key}) : super(key: key);

  @override
  _ConsentLiteracyScreenState createState() => _ConsentLiteracyScreenState();
}

class _ConsentLiteracyScreenState extends State<ConsentLiteracyScreen> {
  final FlutterTts flutterTts = FlutterTts();
  bool _isPlaying = false;
  String _language = 'hi-IN'; // Default to Hindi

  @override
  void initState() {
    super.initState();
    _initTts();
  }

  void _initTts() async {
    await flutterTts.setLanguage(_language);
    await flutterTts.setSpeechRate(0.4);
    
    flutterTts.setCompletionHandler(() {
      setState(() {
        _isPlaying = false;
      });
    });
  }

  Future<void> _speakConsent() async {
    setState(() => _isPlaying = true);
    await flutterTts.speak("मैं अपने स्वास्थ्य डेटा को डॉक्टर के साथ साझा करने की सहमति देता हूँ।");
  }

  Future<void> _stopSpeaking() async {
    await flutterTts.stop();
    setState(() => _isPlaying = false);
  }

  @override
  void dispose() {
    flutterTts.stop();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Patient Consent')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Icon(Icons.privacy_tip, size: 80, color: Colors.blue),
            const SizedBox(height: 30),
            
            const Text(
              'Consent to Share Health Data',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            
            // Visual Literacy Icons
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                Column(
                  children: const [
                    Icon(Icons.person, size: 60, color: Colors.green),
                    Text('You', style: TextStyle(fontSize: 18))
                  ],
                ),
                const Icon(Icons.arrow_forward, size: 40),
                Column(
                  children: const [
                    Icon(Icons.local_hospital, size: 60, color: Colors.red),
                    Text('Doctor', style: TextStyle(fontSize: 18))
                  ],
                ),
              ],
            ),
            
            const SizedBox(height: 40),
            
            // Audio Prompt for low-literacy
            ElevatedButton.icon(
              onPressed: _isPlaying ? _stopSpeaking : _speakConsent,
              icon: Icon(_isPlaying ? Icons.stop : Icons.volume_up, size: 30),
              label: Text(_isPlaying ? 'Stop Audio' : 'Play Audio Instructions (Hindi)'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 20),
                backgroundColor: Colors.blue.shade100,
                foregroundColor: Colors.blue.shade900,
                textStyle: const TextStyle(fontSize: 18),
              ),
            ),
            
            const Spacer(),
            
            // Action Buttons
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () {},
                    style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
                    child: const Text('NO (Deny)', style: TextStyle(fontSize: 18, color: Colors.red)),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {},
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white,
                    ),
                    child: const Text('YES (I Agree)', style: TextStyle(fontSize: 18)),
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
