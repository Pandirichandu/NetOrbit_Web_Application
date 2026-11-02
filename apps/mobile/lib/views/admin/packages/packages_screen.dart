import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../providers/data_providers.dart';
import '../../widgets/widgets.dart';

class PackagesScreen extends ConsumerWidget {
  const PackagesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pkgsAsync = ref.watch(packagesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Broadband Plans & FUP'),
      ),
      body: pkgsAsync.when(
        data: (packages) {
          if (packages.isEmpty) {
            return const EmptyStateView(
              title: 'No Packages Found',
              message: 'Add broadband plan packages to begin selling subscriptions.',
              icon: Icons.inventory_2_outlined,
            );
          }

          return RefreshIndicator(
            onRefresh: () => ref.refresh(packagesProvider.future),
            child: ListView.builder(
              padding: const EdgeInsets.all(16.0),
              itemCount: packages.length,
              itemBuilder: (context, index) {
                final p = packages[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(p.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Colors.white)),
                            StatusBadge(status: p.status),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${p.code} · ${p.validityDays} Days Validity',
                          style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
                        ),
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: AppTheme.surface,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceAround,
                            children: [
                              Row(
                                children: [
                                  const Icon(Icons.arrow_downward, size: 14, color: AppTheme.success),
                                  const SizedBox(width: 4),
                                  Text('${p.downloadSpeed} Mbps', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                ],
                              ),
                              Row(
                                children: [
                                  const Icon(Icons.arrow_upward, size: 14, color: AppTheme.primary),
                                  const SizedBox(width: 4),
                                  Text('${p.uploadSpeed} Mbps', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                ],
                              ),
                              Text(
                                Formatters.currency(p.monthlyPrice),
                                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.primary),
                              ),
                            ],
                          ),
                        ),
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
          onRetry: () => ref.refresh(packagesProvider),
        ),
      ),
    );
  }
}
