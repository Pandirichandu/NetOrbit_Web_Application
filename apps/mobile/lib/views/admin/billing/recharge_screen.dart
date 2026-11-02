import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/constants/api_constants.dart';
import '../../../providers/auth_provider.dart';
import '../../../providers/data_providers.dart';
import '../../widgets/widgets.dart';

class AdminRechargeScreen extends ConsumerStatefulWidget {
  const AdminRechargeScreen({super.key});

  @override
  ConsumerState<AdminRechargeScreen> createState() => _AdminRechargeScreenState();
}

class _AdminRechargeScreenState extends ConsumerState<AdminRechargeScreen> {
  String? _selectedSubId;
  String? _selectedPkgId;
  String _paymentMethod = 'UPI';
  bool _isProcessing = false;

  Future<void> _executeRecharge() async {
    if (_selectedSubId == null || _selectedPkgId == null) return;
    setState(() => _isProcessing = true);
    try {
      final api = ref.read(apiClientProvider);
      final res = await api.post(ApiConstants.recharge, data: {
        'subscriberId': _selectedSubId,
        'packageId': _selectedPkgId,
        'paymentMethod': _paymentMethod,
        'idempotencyKey': 'admin_rech_${DateTime.now().millisecondsSinceEpoch}',
      });

      setState(() => _isProcessing = false);
      if (mounted) {
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
            backgroundColor: AppTheme.surfaceCard,
            title: const Text('Recharge Completed!'),
            content: Text(res['message'] ?? 'Plan successfully extended and RADIUS bandwidth synchronized.'),
            actions: [
              ElevatedButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('OK'),
              ),
            ],
          ),
        );
      }
      ref.invalidate(subscribersProvider);
      ref.invalidate(invoicesProvider);
      ref.invalidate(paymentsProvider);
    } catch (e) {
      setState(() => _isProcessing = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Recharge failed: ${e.toString()}'), backgroundColor: AppTheme.error),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final subsAsync = ref.watch(subscribersProvider);
    final pkgsAsync = ref.watch(packagesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Subscriber Recharge Terminal'),
      ),
      body: subsAsync.when(
        data: (subs) => pkgsAsync.when(
          data: (pkgs) {
            if (subs.isEmpty || pkgs.isEmpty) {
              return const EmptyStateView(
                title: 'Data Unavailable',
                message: 'Add subscribers and packages before processing recharge.',
              );
            }

            _selectedSubId ??= subs.first.id;
            _selectedPkgId ??= pkgs.first.id;

            return SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('TARGET SUBSCRIBER', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.textMuted)),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    initialValue: _selectedSubId,
                    decoration: const InputDecoration(labelText: 'Choose Subscriber Account'),
                    dropdownColor: AppTheme.surfaceCard,
                    items: subs.map((s) => DropdownMenuItem(value: s.id, child: Text('${s.username} (${s.name})'))).toList(),
                    onChanged: (v) => setState(() => _selectedSubId = v),
                  ),
                  const SizedBox(height: 16),

                  const Text('SELECT PACKAGE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.textMuted)),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    initialValue: _selectedPkgId,
                    decoration: const InputDecoration(labelText: 'Choose Broadband Plan'),
                    dropdownColor: AppTheme.surfaceCard,
                    items: pkgs.map((p) => DropdownMenuItem(value: p.id, child: Text('${p.name} — ₹${p.monthlyPrice}'))).toList(),
                    onChanged: (v) => setState(() => _selectedPkgId = v),
                  ),
                  const SizedBox(height: 16),

                  const Text('PAYMENT CHANNEL', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.textMuted)),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    initialValue: _paymentMethod,
                    decoration: const InputDecoration(labelText: 'Method'),
                    dropdownColor: AppTheme.surfaceCard,
                    items: const [
                      DropdownMenuItem(value: 'UPI', child: Text('UPI / QR Code')),
                      DropdownMenuItem(value: 'CARD', child: Text('Debit / Credit Card')),
                      DropdownMenuItem(value: 'NET_BANKING', child: Text('Net Banking')),
                      DropdownMenuItem(value: 'WALLET', child: Text('Account Wallet Balance')),
                    ],
                    onChanged: (v) => setState(() => _paymentMethod = v ?? 'UPI'),
                  ),
                  const SizedBox(height: 24),

                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _isProcessing ? null : _executeRecharge,
                      child: _isProcessing
                          ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Text('Process Recharge & Update RADIUS'),
                    ),
                  ),
                ],
              ),
            );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (err, _) => ErrorStateView(error: err.toString(), onRetry: () => ref.refresh(packagesProvider)),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => ErrorStateView(error: err.toString(), onRetry: () => ref.refresh(subscribersProvider)),
      ),
    );
  }
}
