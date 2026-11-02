import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/constants/api_constants.dart';
import '../../../providers/auth_provider.dart';
import '../../widgets/widgets.dart';

final tenantsListProvider = FutureProvider<List<dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get(ApiConstants.tenants);
  return res as List<dynamic>? ?? [];
});

class TenantsScreen extends ConsumerWidget {
  const TenantsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tenantsAsync = ref.watch(tenantsListProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Multi-Tenant Operations'),
      ),
      body: tenantsAsync.when(
        data: (tenants) {
          if (tenants.isEmpty) {
            return const EmptyStateView(
              title: 'No Tenants Found',
              message: 'Organizations provisioned under NetOrbit will appear here.',
              icon: Icons.business,
            );
          }

          return RefreshIndicator(
            onRefresh: () => ref.refresh(tenantsListProvider.future),
            child: ListView.builder(
              padding: const EdgeInsets.all(16.0),
              itemCount: tenants.length,
              itemBuilder: (context, index) {
                final t = tenants[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: Padding(
                    padding: const EdgeInsets.all(14.0),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(t['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.white)),
                            const SizedBox(height: 2),
                            Text('${t['slug']} · License: ${t['plan']}', style: const TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                            const SizedBox(height: 2),
                            Text('Capacity: ${t['maxSubscribers']} subs / ${t['maxNasDevices']} NAS', style: const TextStyle(fontSize: 10, color: AppTheme.primary)),
                          ],
                        ),
                        StatusBadge(status: t['status'] ?? 'ACTIVE'),
                      ],
                    ),
                  ),
                );
              },
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => ErrorStateView(
          error: err.toString(),
          onRetry: () => ref.refresh(tenantsListProvider),
        ),
      ),
    );
  }
}
