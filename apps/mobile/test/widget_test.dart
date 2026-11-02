import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:netorbit_mobile/views/auth/login_screen.dart';

void main() {
  testWidgets('LoginScreen renders brand title and demo accounts', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: LoginScreen(),
        ),
      ),
    );

    await tester.pump(const Duration(milliseconds: 200));

    // Verify Brand title is rendered
    expect(find.text('NETORBIT'), findsOneWidget);
    expect(find.text('ENTERPRISE AAA & ISP MOBILE'), findsOneWidget);

    // Verify Demo accounts header and buttons exist
    expect(find.text('1-CLICK DEMO ACCOUNTS'), findsOneWidget);
    expect(find.text('Super Admin'), findsOneWidget);
    expect(find.text('Subscriber'), findsOneWidget);
  });
}
