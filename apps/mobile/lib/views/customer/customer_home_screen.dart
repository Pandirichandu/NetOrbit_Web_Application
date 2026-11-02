import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../providers/auth_provider.dart';
import '../../providers/data_providers.dart';
import '../widgets/widgets.dart';

class CustomerHomeScreen extends ConsumerWidget {
  const CustomerHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final dashboardAsync = ref.watch(customerDashboardProvider);

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Welcome, ${auth.user?.name ?? "Subscriber"}', style: const TextStyle(fontSize: 16)),
            Text(
              auth.user?.email ?? '',
              style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout, size: 20),
            onPressed: () => ref.read(authProvider.notifier).logout(),
          ),
        ],
      ),
      body: dashboardAsync.when(
        data: (data) {
          final sub = data['subscriber'] as Map<String, dynamic>?;
          final isOnline = (sub?['activeSessions'] as List<dynamic>?)?.isNotEmpty ?? false;
          final totalUsage = (sub?['totalDownloadBytes'] ?? 0) + (sub?['totalUploadBytes'] ?? 0);

          return RefreshIndicator(
            onRefresh: () => ref.refresh(customerDashboardProvider.future),
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Hero Connection Card
                  Card(
                    child: Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(14),
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [
                            AppTheme.surfaceCard,
                            AppTheme.primary.withValues(alpha: 0.1),
                          ],
                        ),
                      ),
                      padding: const EdgeInsets.all(20.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                'BROADBAND CONNECTION',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 1.0,
                                  color: AppTheme.primary,
                                ),
                              ),
                              StatusBadge(status: isOnline ? 'ONLINE' : 'STANDBY'),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Text(
                            sub?['package']?['name'] ?? 'Ultra Fiber Plan',
                            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              const Icon(Icons.arrow_downward, size: 14, color: AppTheme.success),
                              const SizedBox(width: 4),
                              Text('${sub?['downloadSpeedLimit'] ?? 100} Mbps Down', style: const TextStyle(fontSize: 12)),
                              const SizedBox(width: 16),
                              const Icon(Icons.arrow_upward, size: 14, color: AppTheme.primary),
                              const SizedBox(width: 4),
                              Text('${sub?['uploadSpeedLimit'] ?? 100} Mbps Up', style: const TextStyle(fontSize: 12)),
                            ],
                          ),
                          const SizedBox(height: 16),
                          const Divider(),
                          const SizedBox(height: 12),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('PLAN EXPIRY', style: TextStyle(fontSize: 9, color: AppTheme.textMuted)),
                                  Text(
                                    Formatters.date(sub?['expiryDate']),
                                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
                                  ),
                                ],
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  const Text('FRAMED IP', style: TextStyle(fontSize: 9, color: AppTheme.textMuted)),
                                  Text(
                                    sub?['staticIp'] ?? 'Dynamic Pool',
                                    style: const TextStyle(fontSize: 12, fontFamily: 'monospace', color: AppTheme.primary),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Data Usage Summary Card
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('DATA CONSUMPTION', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.textMuted)),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: AppTheme.purple.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: const Text('Unlimited FUP', style: TextStyle(fontSize: 10, color: AppTheme.purple, fontWeight: FontWeight.bold)),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Text(
                            Formatters.bytes(totalUsage),
                            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('Downloaded', style: TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                                    Text(Formatters.bytes(sub?['totalDownloadBytes'] ?? 0), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                                  ],
                                ),
                              ),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('Uploaded', style: TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                                    Text(Formatters.bytes(sub?['totalUploadBytes'] ?? 0), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => ErrorStateView(
          error: err.toString(),
          onRetry: () => ref.refresh(customerDashboardProvider),
        ),
      ),
    );
  }
}
