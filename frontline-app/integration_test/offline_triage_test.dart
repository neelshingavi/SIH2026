import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:frontline_app/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('Offline Triage to CarePlan Escalation Flow', (tester) async {
    app.main();
    await tester.pumpAndSettle();

    // Ensure we are on login and can proceed
    final usernameField = find.byType(TextField).first;
    await tester.enterText(usernameField, 'demo_worker');
    final loginBtn = find.text('Login');
    await tester.tap(loginBtn);
    await tester.pumpAndSettle();

    // Tap ANC Form
    final ancBtn = find.text('ANC Form (High-Risk Test)');
    expect(ancBtn, findsOneWidget);
    await tester.tap(ancBtn);
    await tester.pumpAndSettle();

    // Fill high risk vitals
    final sysField = find.widgetWithText(TextField, 'Systolic Blood Pressure (mmHg)');
    await tester.enterText(sysField, '170');
    final diaField = find.widgetWithText(TextField, 'Diastolic Blood Pressure (mmHg)');
    await tester.enterText(diaField, '115');
    final hbField = find.widgetWithText(TextField, 'Hemoglobin (g/dL)');
    await tester.enterText(hbField, '11');

    final submitBtn = find.text('Submit');
    await tester.tap(submitBtn);
    await tester.pumpAndSettle();

    // Verify dialog pops up with Emergency / High Risk
    expect(find.textContaining('EMERGENCY'), findsOneWidget);
    expect(find.textContaining('Patient requires escalation to Medical Officer.'), findsOneWidget);

    // Tap Escalate
    final escalateBtn = find.text('ESCALATE TO MO');
    await tester.tap(escalateBtn);
    await tester.pumpAndSettle();

    // Expect snackbar for offline creation
    expect(find.textContaining('Escalated: CarePlan and Referral created offline!'), findsWidgets);
  });
}
