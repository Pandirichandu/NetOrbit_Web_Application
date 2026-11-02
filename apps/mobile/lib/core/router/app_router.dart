import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../providers/auth_provider.dart';
import '../../views/auth/login_screen.dart';
import '../../views/customer/customer_shell_screen.dart';
import '../../views/admin/admin_shell_screen.dart';
import '../../views/admin/subscribers/subscriber_detail_screen.dart';
import '../../views/admin/packages/packages_screen.dart';
import '../../views/admin/billing/invoices_screen.dart';
import '../../views/admin/billing/payments_screen.dart';
import '../../views/admin/billing/recharge_screen.dart';
import '../../views/admin/vouchers/vouchers_screen.dart';
import '../../views/admin/vouchers/qr_scanner_screen.dart';
import '../../views/admin/sessions/sessions_screen.dart';
import '../../views/admin/network/routers_screen.dart';
import '../../views/admin/network/nas_screen.dart';
import '../../views/admin/network/ipam_screen.dart';
import '../../views/admin/network/hotspots_screen.dart';
import '../../views/admin/support/tickets_screen.dart';
import '../../views/admin/support/notifications_screen.dart';
import '../../views/admin/analytics/reports_screen.dart';
import '../../views/admin/analytics/analytics_screen.dart';
import '../../views/admin/governance/audit_logs_screen.dart';
import '../../views/admin/governance/tenants_screen.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/login',
    redirect: (context, state) {
      final isLoggingIn = state.matchedLocation == '/login';

      if (authState.isLoading) return null;

      if (!authState.isAuthenticated) {
        return isLoggingIn ? null : '/login';
      }

      if (isLoggingIn) {
        return authState.isCustomer ? '/customer' : '/admin';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),

      // Customer Portal Routes
      GoRoute(
        path: '/customer',
        builder: (context, state) => const CustomerShellScreen(),
      ),

      // Admin & NOC Console Routes
      GoRoute(
        path: '/admin',
        builder: (context, state) => const AdminShellScreen(),
        routes: [
          GoRoute(
            path: 'subscribers/:id',
            builder: (context, state) => SubscriberDetailScreen(
              subscriberId: state.pathParameters['id']!,
            ),
          ),
          GoRoute(
            path: 'packages',
            builder: (context, state) => const PackagesScreen(),
          ),
          GoRoute(
            path: 'invoices',
            builder: (context, state) => const InvoicesScreen(),
          ),
          GoRoute(
            path: 'payments',
            builder: (context, state) => const PaymentsScreen(),
          ),
          GoRoute(
            path: 'recharge',
            builder: (context, state) => const AdminRechargeScreen(),
          ),
          GoRoute(
            path: 'vouchers',
            builder: (context, state) => const VouchersScreen(),
          ),
          GoRoute(
            path: 'qr-scanner',
            builder: (context, state) => const QrScannerScreen(),
          ),
          GoRoute(
            path: 'sessions',
            builder: (context, state) => const SessionsScreen(),
          ),
          GoRoute(
            path: 'routers',
            builder: (context, state) => const RoutersScreen(),
          ),
          GoRoute(
            path: 'nas',
            builder: (context, state) => const NasScreen(),
          ),
          GoRoute(
            path: 'ipam',
            builder: (context, state) => const IpamScreen(),
          ),
          GoRoute(
            path: 'hotspots',
            builder: (context, state) => const HotspotsScreen(),
          ),
          GoRoute(
            path: 'tickets',
            builder: (context, state) => const AdminTicketsScreen(),
          ),
          GoRoute(
            path: 'notifications',
            builder: (context, state) => const NotificationsScreen(),
          ),
          GoRoute(
            path: 'reports',
            builder: (context, state) => const ReportsScreen(),
          ),
          GoRoute(
            path: 'analytics',
            builder: (context, state) => const AnalyticsScreen(),
          ),
          GoRoute(
            path: 'audit-logs',
            builder: (context, state) => const AuditLogsScreen(),
          ),
          GoRoute(
            path: 'tenants',
            builder: (context, state) => const TenantsScreen(),
          ),
        ],
      ),
    ],
  );
});
