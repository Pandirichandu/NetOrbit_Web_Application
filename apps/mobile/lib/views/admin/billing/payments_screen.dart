import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../providers/data_providers.dart';
import '../../widgets/widgets.dart';

class PaymentsScreen extends ConsumerWidget {
  const PaymentsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final paymentsAsync = ref.watch(paymentsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Payment Transactions'),
      ),
      body: paymentsAsync.when(
        data: (payments) {
          if (payments.isEmpty) {
            return const EmptyStateView(
              title: 'No Payments Recorded',
              message: 'Settled payment transactions will appear here.',
              icon: Icons.credit_card,
            );
          }

          return RefreshIndicator(
            onRefresh: () => ref.refresh(paymentsProvider.future),
            child: ListView.builder(
              padding: const EdgeInsets.all(16.0),
              itemCount: payments.length,
              itemBuilder: (context, index) {
                final p = payments[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: ListTile(
                    leading: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppTheme.primary.withValues(alpha: 0.15),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.payment, size: 18, color: AppTheme.primary),
                    ),
                    title: Text(p.paymentNumber, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, fontFamily: 'monospace')),
                    subtitle: Text('${p.method} · ${Formatters.dateTime(p.paidAt)}', style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                    trailing: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(Formatters.currency(p.amount), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.success)),
                        const SizedBox(height: 2),
                        StatusBadge(status: p.status),
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
          onRetry: () => ref.refresh(paymentsProvider),
        ),
      ),
    );
  }
}
