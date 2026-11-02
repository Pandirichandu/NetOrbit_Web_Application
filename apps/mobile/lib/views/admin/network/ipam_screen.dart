import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../../../providers/data_providers.dart';
import '../../widgets/widgets.dart';

class IpamScreen extends ConsumerWidget {
  const IpamScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ipamAsync = ref.watch(ipamPoolsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('IPAM Subnet Pools'),
      ),
      body: ipamAsync.when(
        data: (pools) {
          if (pools.isEmpty) {
            return const EmptyStateView(
              title: 'No IP Pools Configured',
              message: 'Add CIDR subnet pools for dynamic and static subscriber assignments.',
              icon: Icons.hub,
            );
          }

          return RefreshIndicator(
            onRefresh: () => ref.refresh(ipamPoolsProvider.future),
            child: ListView.builder(
              padding: const EdgeInsets.all(16.0),
              itemCount: pools.length,
              itemBuilder: (context, index) {
                final p = pools[index];
                final percent = p.totalIps > 0 ? (p.usedIps / p.totalIps) : 0.0;

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
                            Text(p.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                            Text(p.cidr, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, fontFamily: 'monospace', color: AppTheme.primary)),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text('Gateway: ${p.gateway} · DNS: ${p.dnsPrimary}', style: const TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                        const SizedBox(height: 12),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('Used: ${p.usedIps} / ${p.totalIps} IPs', style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                            Text('${(percent * 100).toInt()}%', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white)),
                          ],
                        ),
                        const SizedBox(height: 6),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: LinearProgressIndicator(
                            value: percent,
                            backgroundColor: AppTheme.surface,
                            valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.primary),
                            minHeight: 6,
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
          onRetry: () => ref.refresh(ipamPoolsProvider),
        ),
      ),
    );
  }
}
