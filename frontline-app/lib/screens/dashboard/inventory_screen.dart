import 'package:flutter/material.dart';
import '../../services/offline_inventory_service.dart';
import '../../db/database.dart';

class InventoryScreen extends StatefulWidget {
  final OfflineInventoryService inventoryService;
  final String facilityId;

  const InventoryScreen({Key? key, required this.inventoryService, required this.facilityId}) : super(key: key);

  @override
  _InventoryScreenState createState() => _InventoryScreenState();
}

class _InventoryScreenState extends State<InventoryScreen> {
  List<dynamic> inventory = [];
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadInventory();
  }

  Future<void> _loadInventory() async {
    final inv = await widget.inventoryService.getCachedInventory(widget.facilityId);
    setState(() {
      inventory = inv;
      isLoading = false;
    });
  }

  Future<void> _requestMedicine(String drugCode, String drugName) async {
    await widget.inventoryService.requestMedication(patientId, patientName, drugCode, drugName);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Offline Medicine Request queued for sync!')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Facility Inventory')),
      body: isLoading 
        ? const Center(child: CircularProgressIndicator())
        : ListView.builder(
            itemCount: inventory.length,
            itemBuilder: (context, index) {
              final item = inventory[index];
              final isAvailable = item['visibility'] != 'OUT_OF_STOCK';
              
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                child: ListTile(
                  leading: Icon(
                    isAvailable ? Icons.check_circle : Icons.warning,
                    color: isAvailable ? Colors.green : Colors.red,
                  ),
                  title: Text(item['drugName'] ?? 'Unknown Medicine'),
                  subtitle: Text('Qty: \${item['availableQty']} \${item['unit']} | Last Updated (Offline Cache)'),
                  trailing: IconButton(
                    icon: const Icon(Icons.add_shopping_cart, color: Colors.blue),
                    onPressed: () => _requestMedicine('SNOMED-\${item['drugName']}', item['drugName']),
                    tooltip: 'Prescribe',
                  ),
                ),
              );
            },
          ),
    );
  }
}
