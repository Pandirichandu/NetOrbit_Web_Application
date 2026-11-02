import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/constants/api_constants.dart';
import '../../../providers/auth_provider.dart';
import '../../../providers/data_providers.dart';
import '../../widgets/widgets.dart';

class SubscriberDetailScreen extends ConsumerStatefulWidget {
  final String subscriberId;

  const SubscriberDetailScreen({super.key, required this.subscriberId});

  @override
  ConsumerState<SubscriberDetailScreen> createState() => _SubscriberDetailScreenState();
}

class _SubscriberDetailScreenState extends ConsumerState<SubscriberDetailScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _newPassCtrl = TextEditingController(text: 'NewPass@2026!');

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _toggleStatus(String currentStatus) async {
    final isSuspended = currentStatus == 'SUSPENDED';
    final action = isSuspended ? 'activate' : 'suspend';

    try {
      final api = ref.read(apiClientProvider);
      await api.post('${ApiConstants.subscribers}/${widget.subscriberId}/$action');
      ref.invalidate(subscriberDetailProvider(widget.subscriberId));
      ref.invalidate(subscribersProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Subscriber $action successful!'), backgroundColor: AppTheme.success),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString()}'), backgroundColor: AppTheme.error),
        );
      }
    }
  }

  Future<void> _resetPassword() async {
    try {
      final api = ref.read(apiClientProvider);
      await api.post('${ApiConstants.subscribers}/${widget.subscriberId}/reset-password', data: {
        'password': _newPassCtrl.text,
      });
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('RADIUS password updated in radcheck!'), backgroundColor: AppTheme.success),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString()}'), backgroundColor: AppTheme.error),
        );
      }
    }
  }

  void _showResetPasswordDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTheme.surfaceCard,
        title: const Text('Reset RADIUS Password', style: TextStyle(fontSize: 16)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Enter new cleartext password for RADIUS authentication:', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
            const SizedBox(height: 12),
            TextField(controller: _newPassCtrl, decoration: const InputDecoration(labelText: 'New Password')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(onPressed: _resetPassword, child: const Text('Update')),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final subAsync = ref.watch(subscriberDetailProvider(widget.subscriberId));

    return subAsync.when(
      data: (sub) {
        return Scaffold(
          appBar: AppBar(
            title: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(sub.username, style: const TextStyle(fontSize: 15, fontFamily: 'monospace', fontWeight: FontWeight.bold)),
                Text(sub.name, style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
              ],
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.lock_reset, size: 20),
                tooltip: 'Reset RADIUS Password',
                onPressed: _showResetPasswordDialog,
              ),
              IconButton(
                icon: Icon(
                  sub.status == 'SUSPENDED' ? Icons.play_circle_outline : Icons.pause_circle_outline,
                  size: 20,
                  color: sub.status == 'SUSPENDED' ? AppTheme.success : AppTheme.error,
                ),
                tooltip: sub.status == 'SUSPENDED' ? 'Activate' : 'Suspend',
                onPressed: () => _toggleStatus(sub.status),
              ),
            ],
            bottom: TabBar(
              controller: _tabController,
              indicatorColor: AppTheme.primary,
              tabs: const [
                Tab(text: 'Profile'),
                Tab(text: 'Sessions'),
                Tab(text: 'Invoices'),
              ],
            ),
          ),
          body: TabBarView(
            controller: _tabController,
            children: [
              // Tab 1: Profile & Plan Details
              SingleChildScrollView(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('ACCOUNT STATUS', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.textMuted)),
                                StatusBadge(status: sub.status),
                              ],
                            ),
                            const SizedBox(height: 12),
                            _buildInfoRow('Customer Name', sub.name),
                            _buildInfoRow('Mobile Number', sub.mobile),
                            _buildInfoRow('Email Address', sub.email ?? 'N/A'),
                            _buildInfoRow('Assigned Plan', sub.package?.name ?? 'Standard Plan'),
                            _buildInfoRow('Speed Limit', '${sub.downloadSpeedLimit}M / ${sub.uploadSpeedLimit}M'),
                            _buildInfoRow('Framed IP', sub.staticIp ?? 'Dynamic (Pool)'),
                            _buildInfoRow('Plan Expiry', Formatters.date(sub.expiryDate)),
                            _buildInfoRow('Total Consumed', Formatters.bytes((sub.totalDownloadBytes ?? 0) + (sub.totalUploadBytes ?? 0))),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // Tab 2: Active & Historical Sessions
              sub.activeSessions == null || sub.activeSessions!.isEmpty
                  ? const EmptyStateView(
                      title: 'No Active Sessions',
                      message: 'Subscriber is currently offline.',
                      icon: Icons.sensors_off,
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16.0),
                      itemCount: sub.activeSessions!.length,
                      itemBuilder: (context, index) {
                        final sess = sub.activeSessions![index];
                        return Card(
                          margin: const EdgeInsets.only(bottom: 10),
                          child: Padding(
                            padding: const EdgeInsets.all(14.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(sess.sessionId, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11, fontFamily: 'monospace')),
                                    StatusBadge(status: sess.status),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                _buildInfoRow('Framed IP', sess.framedIpAddress ?? 'N/A'),
                                _buildInfoRow('Duration', Formatters.duration(sess.sessionDuration)),
                                _buildInfoRow('Data Traffic', Formatters.bytes((sess.downloadBytes ?? 0) + (sess.uploadBytes ?? 0))),
                              ],
                            ),
                          ),
                        );
                      },
                    ),

              // Tab 3: Invoices
              sub.invoices == null || sub.invoices!.isEmpty
                  ? const EmptyStateView(
                      title: 'No Invoices',
                      message: 'No billing history logged.',
                      icon: Icons.receipt_long_outlined,
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16.0),
                      itemCount: sub.invoices!.length,
                      itemBuilder: (context, index) {
                        final inv = sub.invoices![index];
                        return Card(
                          margin: const EdgeInsets.only(bottom: 10),
                          child: ListTile(
                            title: Text(inv.invoiceNumber, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, fontFamily: 'monospace')),
                            subtitle: Text('Due: ${Formatters.date(inv.dueDate)}', style: const TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                            trailing: Text(
                              Formatters.currency(inv.total),
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.primary),
                            ),
                          ),
                        );
                      },
                    ),
            ],
          ),
        );
      },
      loading: () => const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (err, _) => Scaffold(
        appBar: AppBar(title: const Text('Subscriber Details')),
        body: ErrorStateView(error: err.toString(), onRetry: () => ref.refresh(subscriberDetailProvider(widget.subscriberId))),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
          Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
        ],
      ),
    );
  }
}
