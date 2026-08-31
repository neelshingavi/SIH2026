import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:frontline_app/auth/auth_service.dart';

class ReferralDashboardScreen extends StatefulWidget {
  final bool isIncoming;

  const ReferralDashboardScreen({Key? key, required this.isIncoming}) : super(key: key);

  @override
  _ReferralDashboardScreenState createState() => _ReferralDashboardScreenState();
}

class _ReferralDashboardScreenState extends State<ReferralDashboardScreen> {
  List<dynamic> _referrals = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchReferrals();
  }

  Future<void> _fetchReferrals() async {
    setState(() => _isLoading = true);
    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final token = await authService.getToken();
      final direction = widget.isIncoming ? 'incoming' : 'outgoing';
      
      final url = Uri.parse('http://localhost:3000/referral?direction=$direction');
      final response = await http.get(url, headers: {'Authorization': 'Bearer $token'});

      if (response.statusCode == 200) {
        setState(() {
          _referrals = jsonDecode(response.body);
        });
      } else {
        throw Exception('Failed to load referrals');
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Color _getSlaColor(String slaStatus) {
    if (slaStatus == 'BREACHED') return Colors.red;
    if (slaStatus == 'WARNING') return Colors.orange;
    return Colors.green;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.isIncoming ? 'Incoming Referrals' : 'My Referrals'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _fetchReferrals),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView.builder(
              itemCount: _referrals.length,
              itemBuilder: (context, index) {
                final task = _referrals[index];
                final slaStatus = task['slaStatus'] ?? 'ON_TRACK';
                final priority = task['priority'] ?? 'routine';
                
                return Card(
                  margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: _getSlaColor(slaStatus),
                      child: const Icon(Icons.timer, color: Colors.white),
                    ),
                    title: Text('Task: \${task['status']} (\${priority.toUpperCase()})'),
                    subtitle: Text('Patient: \${task['for']?['reference'] ?? 'Unknown'}\nSLA: $slaStatus'),
                    isThreeLine: true,
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {
                      // Navigate to details if needed
                    },
                  ),
                );
              },
            ),
    );
  }
}
