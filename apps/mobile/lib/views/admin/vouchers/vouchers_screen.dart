import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../providers/data_providers.dart';
import '../../widgets/widgets.dart';

class VouchersScreen extends ConsumerWidget {
  const VouchersScreen({super.key});

  void _showQrDialog(BuildContext context, String code, int speed) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTheme.surfaceCard,
        title: const Text('Voucher QR Ticket', style: TextStyle(fontSize: 16)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
              child: QrImageView(data: 'netorbit:voucher:$code', size: 160),
            ),
            const SizedBox(height: 16),
            Text(code, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, fontFamily: 'monospace', color: Colors.white)),
            const SizedBox(height: 4),
            Text('High Speed WiFi · $speed Mbps', style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
          ],
        ),
        actions: [
          ElevatedButton(onPressed: () => Navigator.pop(context), child: const Text('Close')),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final vouchersAsync = ref.watch(vouchersProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Prepaid Vouchers & Hotspot'),
        actions: [
          IconButton(
            icon: const Icon(Icons.qr_code_scanner, size: 20),
            tooltip: 'Scan QR Ticket',
            onPressed: () => context.push('/admin/qr-scanner'),
          ),
        ],
      ),
      body: vouchersAsync.when(
        data: (vouchers) {
          if (vouchers.isEmpty) {
            return const EmptyStateView(
              title: 'No Vouchers Generated',
              message: 'Batch generate prepaid voucher access PINs to distribute tickets.',
              icon: Icons.confirmation_number_outlined,
            );
          }

          return RefreshIndicator(
            onRefresh: () => ref.refresh(vouchersProvider.future),
            child: ListView.builder(
              padding: const EdgeInsets.all(16.0),
              itemCount: vouchers.length,
              itemBuilder: (context, index) {
                final v = vouchers[index];
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
                            Row(
                              children: [
                                Text(v.code, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, fontFamily: 'monospace', color: Colors.white)),
                                const SizedBox(width: 8),
                                StatusBadge(status: v.status),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${v.downloadSpeed}M/${v.uploadSpeed}M · ${v.durationMinutes ~/ 60} Hours · ${Formatters.currency(v.value)}',
                              style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                            ),
                            const SizedBox(height: 2),
                            Text('Redemptions: ${v.usedCount}/${v.maxUsers} Users', style: const TextStyle(fontSize: 10, color: AppTheme.textMuted)),
                          ],
                        ),
                        IconButton(
                          icon: const Icon(Icons.qr_code, color: AppTheme.primary),
                          onPressed: () => _showQrDialog(context, v.code, v.downloadSpeed),
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
          onRetry: () => ref.refresh(vouchersProvider),
        ),
      ),
    );
  }
}
