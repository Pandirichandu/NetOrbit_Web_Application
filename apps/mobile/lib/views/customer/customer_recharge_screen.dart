import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../core/constants/api_constants.dart';
import '../../providers/auth_provider.dart';
import '../../providers/data_providers.dart';
import '../widgets/widgets.dart';

class CustomerRechargeScreen extends ConsumerStatefulWidget {
  const CustomerRechargeScreen({super.key});

  @override
  ConsumerState<CustomerRechargeScreen> createState() => _CustomerRechargeScreenState();
}

class _CustomerRechargeScreenState extends ConsumerState<CustomerRechargeScreen> {
  String? _selectedPkgId;
  String _paymentMethod = 'UPI';
  bool _isProcessing = false;
  Map<String, dynamic>? _successResult;

  Future<void> _executeRecharge() async {
    if (_selectedPkgId == null) return;
    setState(() => _isProcessing = true);
    try {
      final api = ref.read(apiClientProvider);
      final res = await api.post(ApiConstants.recharge, data: {
        'packageId': _selectedPkgId,
        'paymentMethod': _paymentMethod,
        'idempotencyKey': 'mob_rech_${DateTime.now().millisecondsSinceEpoch}',
      });

      setState(() {
        _isProcessing = false;
        _successResult = res;
      });

      ref.invalidate(customerDashboardProvider);
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
    final pkgsAsync = ref.watch(packagesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Renew / Recharge Plan'),
      ),
      body: _successResult != null
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppTheme.success.withValues(alpha: 0.15),
                        shape: BoxShape.circle,
                        border: Border.all(color: AppTheme.success.withValues(alpha: 0.3)),
                      ),
                      child: const Icon(Icons.check_circle, size: 48, color: AppTheme.success),
                    ),
                    const SizedBox(height: 20),
                    const Text(
                      'Recharge Successful!',
                      style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _successResult?['message'] ?? 'Your subscription has been extended successfully.',
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: () => setState(() => _successResult = null),
                      child: const Text('Done'),
                    ),
                  ],
                ),
              ),
            )
          : pkgsAsync.when(
              data: (packages) {
                if (packages.isEmpty) {
                  return const EmptyStateView(
                    title: 'No Packages Available',
                    message: 'Please contact support for custom plans.',
                  );
                }

                _selectedPkgId ??= packages.first.id;
                final selectedPkg = packages.firstWhere((p) => p.id == _selectedPkgId, orElse: () => packages.first);

                final num subtotal = selectedPkg.monthlyPrice;
                final num tax = (subtotal * 0.18);
                final num total = subtotal + tax;

                return SingleChildScrollView(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'SELECT BROADBAND PLAN',
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.textMuted),
                      ),
                      const SizedBox(height: 12),
                      ...packages.map((pkg) {
                        final isSelected = pkg.id == _selectedPkgId;
                        return GestureDetector(
                          onTap: () => setState(() => _selectedPkgId = pkg.id),
                          child: Card(
                            margin: const EdgeInsets.only(bottom: 10),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                              side: BorderSide(
                                color: isSelected ? AppTheme.primary : AppTheme.border,
                                width: isSelected ? 1.5 : 1,
                              ),
                            ),
                            child: Padding(
                              padding: const EdgeInsets.all(14.0),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(pkg.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                      const SizedBox(height: 4),
                                      Text(
                                        '${pkg.downloadSpeed}M Down / ${pkg.uploadSpeed}M Up · ${pkg.validityDays} Days',
                                        style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                                      ),
                                    ],
                                  ),
                                  Text(
                                    Formatters.currency(pkg.monthlyPrice),
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppTheme.primary),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      }),
                      const SizedBox(height: 20),

                      // Payment Method Selector
                      const Text(
                        'PAYMENT METHOD',
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.textMuted),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          _buildPaymentMethodOption('UPI', 'UPI / QR', Icons.qr_code),
                          const SizedBox(width: 8),
                          _buildPaymentMethodOption('CARD', 'Card', Icons.credit_card),
                          const SizedBox(width: 8),
                          _buildPaymentMethodOption('NET_BANKING', 'NetBanking', Icons.account_balance),
                        ],
                      ),
                      const SizedBox(height: 24),

                      // Order Summary
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('BILLING SUMMARY', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.textMuted)),
                              const SizedBox(height: 12),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text('Plan Amount', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                                  Text(Formatters.currency(subtotal), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text('GST Tax (18%)', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                                  Text(Formatters.currency(tax), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                                ],
                              ),
                              const Divider(height: 20),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text('Total Payable', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                                  Text(
                                    Formatters.currency(total),
                                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.primary),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),

                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _isProcessing ? null : _executeRecharge,
                          child: _isProcessing
                              ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                              : Text('Pay ${Formatters.currency(total)} & Activate'),
                        ),
                      ),
                    ],
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

  Widget _buildPaymentMethodOption(String id, String label, IconData icon) {
    final isSelected = _paymentMethod == id;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _paymentMethod = id),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: isSelected ? AppTheme.primary.withValues(alpha: 0.15) : AppTheme.surfaceCard,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isSelected ? AppTheme.primary : AppTheme.border,
            ),
          ),
          child: Column(
            children: [
              Icon(icon, size: 20, color: isSelected ? AppTheme.primary : AppTheme.textMuted),
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  color: isSelected ? Colors.white : AppTheme.textSecondary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
