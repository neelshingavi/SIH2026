import 'package:flutter/material.dart';

/// A simplified JSON-schema driven dynamic form renderer, 
/// inspired by OpenSRP FHIR Structured Data Capture capabilities.
class DynamicFormRenderer extends StatefulWidget {
  final Map<String, dynamic> schema;
  final Function(Map<String, dynamic>) onSubmit;

  const DynamicFormRenderer({
    Key? key,
    required this.schema,
    required this.onSubmit,
  }) : super(key: key);

  @override
  _DynamicFormRendererState createState() => _DynamicFormRendererState();
}

class _DynamicFormRendererState extends State<DynamicFormRenderer> {
  final Map<String, dynamic> _formData = {};
  final _formKey = GlobalKey<FormState>();

  @override
  Widget build(BuildContext context) {
    final fields = widget.schema['fields'] as List<dynamic>;

    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ...fields.map((field) {
            final type = field['type'];
            final id = field['id'];
            final label = field['label'];
            final required = field['required'] ?? false;

            if (type == 'number') {
              return Padding(
                padding: const EdgeInsets.only(bottom: 16.0),
                child: TextFormField(
                  decoration: InputDecoration(
                    labelText: label,
                    border: const OutlineInputBorder(),
                  ),
                  keyboardType: TextInputType.number,
                  validator: (value) {
                    if (required && (value == null || value.isEmpty)) {
                      return 'This field is required';
                    }
                    return null;
                  },
                  onSaved: (value) {
                    _formData[id] = double.tryParse(value ?? '');
                  },
                ),
              );
            }
            
            return const SizedBox.shrink();
          }).toList(),
          
          ElevatedButton(
            onPressed: () {
              if (_formKey.currentState!.validate()) {
                _formKey.currentState!.save();
                widget.onSubmit(_formData);
              }
            },
            child: const Padding(
              padding: EdgeInsets.all(16.0),
              child: Text('Submit Assessment'),
            ),
          )
        ],
      ),
    );
  }
}
