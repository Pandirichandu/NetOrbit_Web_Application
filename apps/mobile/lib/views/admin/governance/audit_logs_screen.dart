import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/constants/api_constants.dart';
import '../../../providers/auth_provider.dart';
import '../../widgets/widgets.dart';

final auditLogsProvider = FutureProvider<List<dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get(ApiConstants.auditLogs);
  return (res['items'] as List<dynamic>?) ?? [];
});

class AuditLogsScreen extends ConsumerWidget {
  const AuditLogsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final logsAsync = ref.watch(auditLogsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Administrative Audit Trail'),
      ),
      body: logsAsync.when(
        data: (logs) {
          if (logs.isEmpty) {
            return const EmptyStateView(
              title: 'No Audit Records',
              message: 'Compliance and configuration change logs will appear here.',
              icon: Icons.history,
            );
          }

          return RefreshIndicator(
            onRefresh: () => ref.refresh(auditLogsProvider.future),
            child: ListView.builder(
              padding: const EdgeInsets.all(16.0),
              itemCount: logs.length,
              itemBuilder: (context, index) {
                final l = logs[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 10),
                  child: ListTile(
                    title: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(l['action'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, fontFamily: 'monospace', color: AppTheme.primary)),
                        Text(Formatters.dateTime(l['createdAt']), style: const TextStyle(fontSize: 10, color: AppTheme.textMuted)),
                      ],
                    ),
                    subtitle: Padding(
                      padding: const EdgeInsets.only(top: 4.0),
                      child: Text(
                        'Actor: ${l['user']?['name'] ?? "System"} · ${l['entityType']} (${l['entityId']?.toString().substring(0, 8) ?? ""})',
                        style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                      ),
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
          onRetry: () => ref.refresh(auditLogsProvider),
        ),
      ),
    );
  }
}
