import 'dart:io';
import 'package:flutter/foundation.dart';

class ApiConstants {
  // Configurable base URL: Android emulator uses 10.0.2.2, Web/Desktop/iOS uses localhost
  static String get baseUrl {
    if (kIsWeb) {
      return 'http://localhost:4000/api/v1';
    }
    if (Platform.isAndroid) {
      return 'http://10.0.2.2:4000/api/v1';
    }
    return 'http://localhost:4000/api/v1';
  }

  // Auth endpoints
  static const String login = '/auth/login';
  static const String refresh = '/auth/refresh';
  static const String me = '/auth/me';

  // Core endpoints
  static const String dashboard = '/analytics/dashboard';
  static const String subscribers = '/subscribers';
  static const String packages = '/packages';
  static const String invoices = '/billing/invoices';
  static const String payments = '/billing/payments';
  static const String recharge = '/payments/recharge/execute';
  static const String vouchers = '/vouchers';
  static const String bulkGenerateVouchers = '/vouchers/bulk-generate';
  static const String redeemVoucher = '/vouchers/redeem';
  static const String activeSessions = '/sessions/active';
  static const String routers = '/routers';
  static const String nas = '/nas';
  static const String ipam = '/ipam/pools';
  static const String ipamSummary = '/ipam/summary';
  static const String hotspots = '/hotspots/sites';
  static const String tickets = '/tickets';
  static const String notifications = '/notifications/logs';
  static const String reportsTopUsers = '/reports/top-bandwidth-users';
  static const String auditLogs = '/audit-logs';
  static const String tenants = '/tenants';

  // Customer Portal endpoints
  static const String customerDashboard = '/customer-portal/dashboard';
  static const String customerUsage = '/customer-portal/usage';
}
