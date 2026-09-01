import 'package:flutter/material.dart';

class InventoryScreen extends StatefulWidget {
  const InventoryScreen({Key? key}) : super(key: key);

  @override
  _InventoryScreenState createState() => _InventoryScreenState();
}

class _InventoryScreenState extends State<InventoryScreen> {
  // Mock local stock
  final List<Map<String, dynamic>> _localStock = [
    {'name': 'Paracetamol 500mg', 'qty': 200, 'status': 'IN_STOCK', 'pmjayCovered': true},
    {'name': 'Amoxicillin 250mg', 'qty': 50, 'status': 'IN_STOCK', 'pmjayCovered': true},
    {'name': 'Telmisartan 40mg', 'qty': 0, 'status': 'OUT_OF_STOCK', 'pmjayCovered': false},
    {'name': 'Metformin 500mg', 'qty': 10, 'status': 'LOW_STOCK', 'pmjayCovered': true},
  ];

  void _showNearbyFacilities(BuildContext context, String drugName) {
    // In a real app, this would hit the backend /stock/search endpoint
    // to get the nearest facilities with stock.
    final mockNearby = [
      {'facility': 'CHC-Kalyan', 'dist': '12km', 'qty': 150},
      {'facility': 'PHC-Navi', 'dist': '18km', 'qty': 45},
      {'facility': 'District Hospital', 'dist': '30km', 'qty': 1200},
    ];

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Availability for $drugName', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              const Text('Available at nearby facilities:', style: TextStyle(color: Colors.grey)),
              const SizedBox(height: 8),
              ...mockNearby.map((f) => ListTile(
                leading: const Icon(Icons.local_hospital, color: Colors.blue),
                title: Text(f['facility'] as String),
                subtitle: Text('${f['dist']} away'),
                trailing: Text('${f['qty']} in stock', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.green)),
              )).toList(),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Inventory & Stock')),
      body: ListView.builder(
        itemCount: _localStock.length,
        itemBuilder: (context, index) {
          final item = _localStock[index];
          final isOutOfStock = item['qty'] == 0;
          
          return Card(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: ListTile(
              title: Text(item['name'], style: TextStyle(
                fontWeight: FontWeight.bold,
                decoration: isOutOfStock ? TextDecoration.lineThrough : null,
                color: isOutOfStock ? Colors.grey : Colors.black,
              )),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Quantity: ${item['qty']}'),
                  if (item['pmjayCovered'] == true)
                    Container(
                      margin: const EdgeInsets.only(top: 4),
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(color: Colors.green.shade100, borderRadius: BorderRadius.circular(4)),
                      child: const Text('Free under PMJAY', style: TextStyle(fontSize: 10, color: Colors.green)),
                    ),
                  if (item['pmjayCovered'] == false)
                    Container(
                      margin: const EdgeInsets.only(top: 4),
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(color: Colors.red.shade100, borderRadius: BorderRadius.circular(4)),
                      child: const Text('Out of Pocket', style: TextStyle(fontSize: 10, color: Colors.red)),
                    ),
                ],
              ),
              trailing: isOutOfStock 
                ? ElevatedButton.icon(
                    onPressed: () => _showNearbyFacilities(context, item['name']),
                    icon: const Icon(Icons.search, size: 16),
                    label: const Text('Find Nearby'),
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.orange.shade100, foregroundColor: Colors.orange.shade900),
                  )
                : (item['qty'] < 20 
                    ? const Icon(Icons.warning, color: Colors.orange) 
                    : const Icon(Icons.check_circle, color: Colors.green)),
            ),
          );
        },
      ),
    );
  }
}
