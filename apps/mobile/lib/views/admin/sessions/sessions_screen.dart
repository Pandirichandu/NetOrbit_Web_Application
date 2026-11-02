import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../providers/auth_provider.dart';
import '../../../providers/data_providers.dart';
import '../../widgets/widgets.dart';

class SessionsScreen extends ConsumerWidget {
  const SessionsScreen({super.key});

  Future<void> _disconnectSession(BuildContext context, WidgetRef ref, String id, String username) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTheme.surfaceCard,
        title: const Text('Disconnect Session?'),
        content: Text('Force disconnect PPPoE tunnel for $username via RADIUS CoA UDP 3799?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.error),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Disconnect'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      final api = ref.read(apiClientProvider);
      await api.post('/sessions/$id/disconnect', data: {'reason': 'Admin-Mobile-Disconnect'});
      ref.invalidate(activeSessionsProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Session for $username disconnected.'), backgroundColor: AppTheme.success),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString()}'), backgroundColor: AppTheme.error),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sessionsAsync = ref.watch(activeSessionsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Active RADIUS Sessions'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, size: 20),
            onPressed: () => ref.refresh(activeSessionsProvider),
          ),
        ],
      ),
      body: sessionsAsync.when(
        data: (sessions) {
          if (sessions.isEmpty) {
            return const EmptyStateView(
              title: 'No Active Sessions',
              message: 'No subscribers currently authenticated on BNG routers.',
              icon: Icons.sensors_off,
            );
          }

          return RefreshIndicator(
            onRefresh: () => ref.refresh(activeSessionsProvider.future),
            child: ListView.builder(
              padding: const EdgeInsets.all(16.0),
              itemCount: sessions.length,
              itemBuilder: (context, index) {
                final s = sessions[index];
                final totalBytes = (s.downloadBytes ?? 0) + (s.uploadBytes ?? 0);

                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: Padding(
                    padding: const EdgeInsets.all(14.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(s.username, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, fontFamily: 'monospace')),
                            StatusBadge(status: s.status),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            const Text('IP: ', style: TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                            Text(s.framedIpAddress ?? 'Dynamic', style: const TextStyle(fontSize: 11, fontFamily: 'monospace', color: AppTheme.primary)),
                            const SizedBox(width: 12),
                            const Text('Limit: ', style: TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                            Text(s.rateLimit ?? '100M/100M', style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('Duration: ${Formatters.duration(s.sessionDuration)}', style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                            Text('Traffic: ${Formatters.bytes(totalBytes)}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.success)),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Align(
                          alignment: Alignment.centerRight,
                          child: OutlinedButton.icon(
                            style: OutlinedButton.styleFrom(
                              foregroundColor: AppTheme.error,
                              side: const BorderSide(color: AppTheme.error),
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            ),
                            onPressed: () => _disconnectSession(context, ref, s.id, s.username),
                            icon: const Icon(Icons.power_settings_new, size: 14),
                            label: const Text('Force CoA Disconnect', style: TextStyle(fontSize: 11)),
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
          onRetry: () => ref.refresh(activeSessionsProvider),
        ),
      ),
    );
  }
}
