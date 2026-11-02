import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../../../providers/data_providers.dart';
import '../../widgets/widgets.dart';

class NasScreen extends ConsumerWidget {
  const NasScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final nasAsync = ref.watch(nasProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('NAS Hardware Directory'),
      ),
      body: nasAsync.when(
        data: (devices) {
          if (devices.isEmpty) {
            return const EmptyStateView(
              title: 'No NAS Gateways',
              message: 'Register Network Access Servers to receive RADIUS authentications.',
              icon: Icons.dns,
            );
          }

          return RefreshIndicator(
            onRefresh: () => ref.refresh(nasProvider.future),
            child: ListView.builder(
              padding: const EdgeInsets.all(16.0),
              itemCount: devices.length,
              itemBuilder: (context, index) {
                final n = devices[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: ListTile(
                    leading: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppTheme.primary.withValues(alpha: 0.15),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.dns, size: 18, color: AppTheme.primary),
                    ),
                    title: Text(n.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    subtitle: Text('${n.ipAddress} · ${n.vendor} (CoA Port: ${n.port})', style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                    trailing: StatusBadge(status: n.status),
                  ),
                );
              },
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => ErrorStateView(
          error: err.toString(),
          onRetry: () => ref.refresh(nasProvider),
        ),
      ),
    );
  }
}
