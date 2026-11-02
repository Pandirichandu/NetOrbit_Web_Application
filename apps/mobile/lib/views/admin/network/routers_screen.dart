import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../providers/data_providers.dart';
import '../../widgets/widgets.dart';

class RoutersScreen extends ConsumerWidget {
  const RoutersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final routersAsync = ref.watch(routersProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Routers & Telemetry'),
      ),
      body: routersAsync.when(
        data: (routers) {
          if (routers.isEmpty) {
            return const EmptyStateView(
              title: 'No Routers Registered',
              message: 'Add MikroTik or Cisco gateway routers to stream live telemetry.',
              icon: Icons.router,
            );
          }

          return RefreshIndicator(
            onRefresh: () => ref.refresh(routersProvider.future),
            child: ListView.builder(
              padding: const EdgeInsets.all(16.0),
              itemCount: routers.length,
              itemBuilder: (context, index) {
                final r = routers[index];
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
                            Text(r.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.white)),
                            StatusBadge(status: r.status),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text('${r.ipAddress} · ${r.vendor}', style: const TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                        const SizedBox(height: 12),

                        // CPU & Memory Gauges
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      const Text('CPU Load', style: TextStyle(fontSize: 10, color: AppTheme.textSecondary)),
                                      Text('${r.cpuUsage}%', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.primary)),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(4),
                                    child: LinearProgressIndicator(
                                      value: r.cpuUsage / 100,
                                      backgroundColor: AppTheme.surface,
                                      valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.primary),
                                      minHeight: 6,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      const Text('RAM Usage', style: TextStyle(fontSize: 10, color: AppTheme.textSecondary)),
                                      Text('${r.memoryUsage}%', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.success)),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(4),
                                    child: LinearProgressIndicator(
                                      value: r.memoryUsage / 100,
                                      backgroundColor: AppTheme.surface,
                                      valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.success),
                                      minHeight: 6,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('RX: ${Formatters.bytes(r.trafficInBps)}/s', style: const TextStyle(fontSize: 11, color: AppTheme.success)),
                            Text('TX: ${Formatters.bytes(r.trafficOutBps)}/s', style: const TextStyle(fontSize: 11, color: AppTheme.primary)),
                          ],
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
          onRetry: () => ref.refresh(routersProvider),
        ),
      ),
    );
  }
}
