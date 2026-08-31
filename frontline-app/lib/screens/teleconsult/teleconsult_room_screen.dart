import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:frontline_app/auth/auth_service.dart';
import 'package:livekit_client/livekit_client.dart';

class TeleconsultRoomScreen extends StatefulWidget {
  final String taskId;

  const TeleconsultRoomScreen({Key? key, required this.taskId}) : super(key: key);

  @override
  _TeleconsultRoomScreenState createState() => _TeleconsultRoomScreenState();
}

class _TeleconsultRoomScreenState extends State<TeleconsultRoomScreen> {
  Room? _room;
  bool _connecting = false;
  String _error = '';

  @override
  void initState() {
    super.initState();
    _connectToLiveKit();
  }

  Future<void> _connectToLiveKit() async {
    setState(() => _connecting = true);
    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final token = await authService.getToken();
      
      // Get JWT from NestJS secure backend
      final url = Uri.parse('http://localhost:3000/teleconsult/token');
      final response = await http.post(
        url,
        headers: {'Authorization': 'Bearer $token', 'Content-Type': 'application/json'},
        body: jsonEncode({'taskId': widget.taskId}),
      );

      if (response.statusCode != 201 && response.statusCode != 200) {
        throw Exception('Failed to get room token. Code: \${response.statusCode}');
      }

      final data = jsonDecode(response.body);
      final roomUrl = data['url'];
      final roomToken = data['token'];

      final room = Room();
      await room.connect(roomUrl, roomToken);
      
      // Enable local camera and mic
      await room.localParticipant?.setCameraEnabled(true);
      await room.localParticipant?.setMicrophoneEnabled(true);

      if (mounted) {
        setState(() => _room = room);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _error = 'Connection failed: $e. You can try the Offline Fallback.');
      }
    } finally {
      if (mounted) setState(() => _connecting = false);
    }
  }

  @override
  void dispose() {
    _room?.disconnect();
    super.dispose();
  }

  Future<void> _endCall() async {
    _room?.disconnect();
    
    // Show completion dialog for Specialist to close the loop
    final notesController = TextEditingController();
    final bool? completed = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Text('Complete Consultation'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Document clinical outcomes and recommend follow-up (Counter-Referral):'),
            const SizedBox(height: 16),
            TextField(
              controller: notesController,
              decoration: const InputDecoration(labelText: 'Clinical Notes', border: OutlineInputBorder()),
              maxLines: 4,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Skip (Just End Video)'),
          ),
          ElevatedButton(
            onPressed: () async {
              try {
                final authService = Provider.of<AuthService>(context, listen: false);
                final token = await authService.getToken();
                final url = Uri.parse('http://localhost:3000/teleconsult/\${widget.taskId}/complete');
                
                await http.post(
                  url,
                  headers: {'Authorization': 'Bearer $token', 'Content-Type': 'application/json'},
                  body: jsonEncode({'notes': notesController.text}),
                );
                Navigator.pop(context, true);
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to complete: $e')));
              }
            },
            child: const Text('Complete & Generate Follow-up'),
          ),
        ],
      ),
    );

    if (mounted) {
      if (completed == true) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Consultation Completed. Follow-up CarePlan generated.')));
      }
      Navigator.pop(context); // Go back to dashboard
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_connecting) {
      return Scaffold(
        appBar: AppBar(title: const Text('Joining Consultation...')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_error.isNotEmpty || _room == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Teleconsult Fallback')),
        body: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.signal_wifi_off, size: 64, color: Colors.grey),
              const SizedBox(height: 16),
              Text(_error, textAlign: TextAlign.center, style: const TextStyle(color: Colors.red)),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: _connectToLiveKit,
                child: const Text('Retry Connection'),
              ),
              const SizedBox(height: 16),
              OutlinedButton(
                onPressed: () {
                  // Fallback: Proceed with offline clinical workflow
                  Navigator.pop(context);
                },
                child: const Text('Continue Offline Workflow'),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Teleconsultation Active'),
        actions: [
          IconButton(
            icon: const Icon(Icons.call_end),
            color: Colors.red,
            onPressed: _endCall,
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: VideoTrackRenderer(
              _room!.localParticipant!.videoTrackPublications.first.track as VideoTrack,
            ),
          ),
          // In a real app we'd map over remote participants
        ],
      ),
    );
  }
}
