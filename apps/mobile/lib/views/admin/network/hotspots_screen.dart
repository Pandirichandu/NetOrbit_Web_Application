import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/constants/api_constants.dart';
import '../../../providers/auth_provider.dart';
import '../../widgets/widgets.dart';

final hotspotsProvider = FutureProvider<List<dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get(ApiConstants.hotspots);
  return res as List<dynamic>? ?? [];
});

class HotspotsScreen extends ConsumerWidget {
  const HotspotsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final hotspotsAsync = ref.watch(hotspotsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Hotspot Sites & SSIDs'),
      ),
      body: hotspotsAsync.when(
        data: (sites) {
          if (sites.isEmpty) {
            return const EmptyStateView(
              title: 'No Hotspot Zones',
              message: 'Public WiFi hotspot deployments will be listed here.',
              icon: Icons.wifi,
            );
          }

          return RefreshIndicator(
            onRefresh: () => ref.refresh(hotspotsProvider.future),
            child: ListView.builder(
              padding: const EdgeInsets.all(16.0),
              itemCount: sites.length,
              itemBuilder: (context, index) {
                final s = sites[index];
                final ssids = (s['ssids'] as List<dynamic>?) ?? [];

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
                            Text(s['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                            StatusBadge(status: s['status'] ?? 'ACTIVE'),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text('${s['code']} · ${s['location'] ?? "Main Zone"}', style: const TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 6,
                          runSpacing: 4,
                          children: ssids.map((ssid) {
                            return Chip(
                              backgroundColor: AppTheme.surface,
                              label: Text('${ssid['ssidName']} (VLAN ${ssid['vlanId']})', style: const TextStyle(fontSize: 10, color: AppTheme.primary)),
                              padding: EdgeInsets.zero,
                              visualDensity: VisualDensity.compact,
                            );
                          }).toList(),
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
          onRetry: () => ref.refresh(hotspotsProvider),
        ),
      ),
    );
  }
}
