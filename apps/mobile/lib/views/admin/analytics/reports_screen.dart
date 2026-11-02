import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/constants/api_constants.dart';
import '../../../providers/auth_provider.dart';
import '../../widgets/widgets.dart';

final topBandwidthUsersProvider = FutureProvider<List<dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get(ApiConstants.reportsTopUsers);
  return res as List<dynamic>? ?? [];
});

class ReportsScreen extends ConsumerWidget {
  const ReportsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final topUsersAsync = ref.watch(topBandwidthUsersProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Reports & Exports'),
      ),
      body: topUsersAsync.when(
        data: (users) {
          return SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Bandwidth Leaderboard', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white)),
                const SizedBox(height: 4),
                const Text('Top heavy data consuming subscribers', style: TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                const SizedBox(height: 12),

                ...users.asMap().entries.map((e) {
                  final idx = e.key;
                  final u = e.value;
                  final total = (u['totalDownloadBytes'] ?? 0) + (u['totalUploadBytes'] ?? 0);

                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      leading: CircleAvatar(
                        radius: 14,
                        backgroundColor: AppTheme.surface,
                        child: Text(
                          '#${idx + 1}',
                          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.primary),
                        ),
                      ),
                      title: Text(u['username'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, fontFamily: 'monospace')),
                      subtitle: Text(u['name'] ?? '', style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                      trailing: Text(
                        Formatters.bytes(total),
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.success),
                      ),
                    ),
                  );
                }),
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => ErrorStateView(
          error: err.toString(),
          onRetry: () => ref.refresh(topBandwidthUsersProvider),
        ),
      ),
    );
  }
}
