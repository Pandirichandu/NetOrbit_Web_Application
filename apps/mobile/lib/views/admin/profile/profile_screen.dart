import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../providers/auth_provider.dart';
import '../../widgets/widgets.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final user = auth.user;

    final List<Map<String, dynamic>> menuItems = [
      {'title': 'Broadband Packages', 'subtitle': 'Speed tiers, pricing & FUP', 'icon': Icons.inventory_2_outlined, 'route': '/admin/packages'},
      {'title': 'Prepaid Vouchers', 'subtitle': 'PIN codes & QR tickets', 'icon': Icons.confirmation_number_outlined, 'route': '/admin/vouchers'},
      {'title': 'Scan Voucher QR', 'subtitle': 'Camera barcode redemption', 'icon': Icons.qr_code_scanner, 'route': '/admin/qr-scanner'},
      {'title': 'Routers & Telemetry', 'subtitle': 'CPU, Memory, RX/TX stream', 'icon': Icons.router, 'route': '/admin/routers'},
      {'title': 'NAS Directory', 'subtitle': 'Network Access Server BNGs', 'icon': Icons.dns, 'route': '/admin/nas'},
      {'title': 'IPAM Subnet Pools', 'subtitle': 'CIDR pool utilization', 'icon': Icons.hub, 'route': '/admin/ipam'},
      {'title': 'Hotspot Sites & SSIDs', 'subtitle': 'Public WiFi zones', 'icon': Icons.wifi, 'route': '/admin/hotspots'},
      {'title': 'Helpdesk Support', 'subtitle': 'Customer issue tickets', 'icon': Icons.support_agent, 'route': '/admin/tickets'},
      {'title': 'Notification Logs', 'subtitle': 'SMS, WhatsApp, Email audit', 'icon': Icons.notifications_none, 'route': '/admin/notifications'},
      {'title': 'Reports & Exports', 'subtitle': 'Bandwidth leaderboard & CSV', 'icon': Icons.download, 'route': '/admin/reports'},
      {'title': 'Intelligence & ARPU', 'subtitle': 'Revenue analytics & churn', 'icon': Icons.bar_chart, 'route': '/admin/analytics'},
      {'title': 'Audit Logs Trail', 'subtitle': 'Immutable compliance changes', 'icon': Icons.history, 'route': '/admin/audit-logs'},
      if (user?.isSuperAdmin ?? false)
        {'title': 'Tenants Control', 'subtitle': 'Multi-tenant organization licenses', 'icon': Icons.business, 'route': '/admin/tenants'},
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Console & Modules'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            // User Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 24,
                      backgroundColor: AppTheme.primary,
                      child: Text(
                        user?.name.isNotEmpty ?? false ? user!.name[0].toUpperCase() : 'U',
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(user?.name ?? 'Staff User', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Colors.white)),
                          const SizedBox(height: 2),
                          Text(user?.email ?? '', style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                          const SizedBox(height: 4),
                          StatusBadge(status: user?.role ?? 'STAFF'),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Modules Grid List
            ...menuItems.map((item) {
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppTheme.surface,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(item['icon'] as IconData, size: 18, color: AppTheme.primary),
                  ),
                  title: Text(item['title'] as String, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  subtitle: Text(item['subtitle'] as String, style: const TextStyle(fontSize: 10, color: AppTheme.textMuted)),
                  trailing: const Icon(Icons.chevron_right, size: 16, color: AppTheme.textMuted),
                  onTap: () => context.push(item['route'] as String),
                ),
              );
            }),

            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppTheme.error,
                  side: const BorderSide(color: AppTheme.error),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                onPressed: () => ref.read(authProvider.notifier).logout(),
                icon: const Icon(Icons.logout, size: 18),
                label: const Text('Sign Out of NetOrbit'),
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}
