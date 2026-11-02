import 'package:flutter_test/flutter_test.dart';
import 'package:netorbit_mobile/models/models.dart';
import 'package:netorbit_mobile/core/utils/formatters.dart';

void main() {
  group('NetOrbit Data Models & Serialization Tests', () {
    test('UserModel should parse correctly from JSON', () {
      final json = {
        'id': 'user-123',
        'email': 'admin@netorbit.local',
        'name': 'Super Administrator',
        'role': 'SUPER_ADMIN',
        'tenantId': 'tenant-core-1',
        'tenantName': 'Metro Fiber Telecom',
      };

      final user = UserModel.fromJson(json);

      expect(user.id, 'user-123');
      expect(user.email, 'admin@netorbit.local');
      expect(user.name, 'Super Administrator');
      expect(user.role, 'SUPER_ADMIN');
      expect(user.isCustomer, false);
      expect(user.isSuperAdmin, true);
    });

    test('SubscriberModel should parse speed limits and status', () {
      final json = {
        'id': 'sub-456',
        'username': 'vikram.malhotra',
        'name': 'Vikram Malhotra',
        'mobile': '+919876543210',
        'downloadSpeedLimit': 200,
        'uploadSpeedLimit': 100,
        'totalDownloadBytes': 5368709120, // 5 GB
        'totalUploadBytes': 1073741824,   // 1 GB
        'status': 'ACTIVE',
      };

      final sub = SubscriberModel.fromJson(json);

      expect(sub.username, 'vikram.malhotra');
      expect(sub.downloadSpeedLimit, 200);
      expect(sub.status, 'ACTIVE');
    });

    test('Formatters should format bytes and duration correctly', () {
      expect(Formatters.bytes(1073741824), '1.00 GB');
      expect(Formatters.bytes(52428800), '50.00 MB');
      expect(Formatters.duration(3665), '1h 1m');
      expect(Formatters.duration(45), '45s');
    });
  });
}
