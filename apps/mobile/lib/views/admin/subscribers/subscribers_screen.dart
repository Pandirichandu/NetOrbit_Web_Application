import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/constants/api_constants.dart';
import '../../../providers/auth_provider.dart';
import '../../../providers/data_providers.dart';
import '../../../models/models.dart';
import '../../widgets/widgets.dart';

class SubscribersScreen extends ConsumerStatefulWidget {
  const SubscribersScreen({super.key});

  @override
  ConsumerState<SubscribersScreen> createState() => _SubscribersScreenState();
}

class _SubscribersScreenState extends ConsumerState<SubscribersScreen> {
  String _searchQuery = '';
  String? _statusFilter;

  final _usernameCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController(text: 'password123');
  final _nameCtrl = TextEditingController();
  final _mobileCtrl = TextEditingController();
  String? _selectedPkgId;

  Future<void> _createSubscriber() async {
    if (_usernameCtrl.text.trim().isEmpty || _nameCtrl.text.trim().isEmpty || _mobileCtrl.text.trim().isEmpty) return;
    try {
      final api = ref.read(apiClientProvider);
      await api.post(ApiConstants.subscribers, data: {
        'username': _usernameCtrl.text.trim(),
        'password': _passwordCtrl.text,
        'name': _nameCtrl.text.trim(),
        'mobile': _mobileCtrl.text.trim(),
        'packageId': _selectedPkgId,
        'connectionType': 'PPPoE',
      });
      _usernameCtrl.clear();
      _nameCtrl.clear();
      _mobileCtrl.clear();
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Subscriber created & provisioned!'), backgroundColor: AppTheme.success),
        );
      }
      ref.invalidate(subscribersProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString()}'), backgroundColor: AppTheme.error),
        );
      }
    }
  }

  void _showCreateSheet(List<PackageModel> packages) {
    if (packages.isNotEmpty) _selectedPkgId ??= packages.first.id;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => StatefulBuilder(
        builder: (context, setSheetState) => Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(context).viewInsets.bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Add & Provision Subscriber', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              TextField(
                controller: _usernameCtrl,
                decoration: const InputDecoration(labelText: 'RADIUS Username', hintText: 'e.g. rohit.sharma'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _passwordCtrl,
                decoration: const InputDecoration(labelText: 'Password'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _nameCtrl,
                decoration: const InputDecoration(labelText: 'Full Customer Name'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _mobileCtrl,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(labelText: 'Mobile Phone (+91)'),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _selectedPkgId,
                decoration: const InputDecoration(labelText: 'Broadband Package'),
                dropdownColor: AppTheme.surfaceCard,
                items: packages
                    .map((p) => DropdownMenuItem(value: p.id, child: Text('${p.name} (₹${p.monthlyPrice})')))
                    .toList(),
                onChanged: (v) => setSheetState(() => _selectedPkgId = v),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _createSubscriber,
                  child: const Text('Create Subscriber'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final subsAsync = ref.watch(subscribersProvider);
    final pkgsAsync = ref.watch(packagesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Subscribers Directory'),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          pkgsAsync.whenData((pkgs) => _showCreateSheet(pkgs));
        },
        icon: const Icon(Icons.person_add),
        label: const Text('New Subscriber'),
        backgroundColor: AppTheme.primary,
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          // Search & Status Filter
          Padding(
            padding: const EdgeInsets.all(12.0),
            child: Column(
              children: [
                TextField(
                  onChanged: (v) => setState(() => _searchQuery = v),
                  decoration: InputDecoration(
                    hintText: 'Search username, customer name, mobile...',
                    prefixIcon: const Icon(Icons.search, size: 18),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(icon: const Icon(Icons.clear, size: 16), onPressed: () => setState(() => _searchQuery = ''))
                        : null,
                  ),
                ),
                const SizedBox(height: 8),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildFilterChip('ALL', null),
                      _buildFilterChip('ACTIVE', 'ACTIVE'),
                      _buildFilterChip('SUSPENDED', 'SUSPENDED'),
                      _buildFilterChip('EXPIRED', 'EXPIRED'),
                      _buildFilterChip('BLOCKED', 'BLOCKED'),
                    ],
                  ),
                ),
              ],
            ),
          ),

          Expanded(
            child: subsAsync.when(
              data: (subscribers) {
                final filtered = subscribers.where((s) {
                  final matchesSearch = s.username.toLowerCase().contains(_searchQuery.toLowerCase()) ||
                      s.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
                      s.mobile.contains(_searchQuery);
                  final matchesStatus = _statusFilter == null || s.status == _statusFilter;
                  return matchesSearch && matchesStatus;
                }).toList();

                if (filtered.isEmpty) {
                  return const EmptyStateView(
                    title: 'No Subscribers Found',
                    message: 'Try changing search query or filters.',
                    icon: Icons.people_outline,
                  );
                }

                return RefreshIndicator(
                  onRefresh: () => ref.refresh(subscribersProvider.future),
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    itemCount: filtered.length,
                    itemBuilder: (context, index) {
                      final sub = filtered[index];
                      final isOnline = sub.activeSessions?.isNotEmpty ?? false;

                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: InkWell(
                          onTap: () => context.push('/admin/subscribers/${sub.id}'),
                          borderRadius: BorderRadius.circular(14),
                          child: Padding(
                            padding: const EdgeInsets.all(14.0),
                            child: Row(
                              children: [
                                Stack(
                                  children: [
                                    CircleAvatar(
                                      radius: 20,
                                      backgroundColor: AppTheme.primary.withValues(alpha: 0.15),
                                      child: Text(
                                        sub.name.isNotEmpty ? sub.name[0].toUpperCase() : 'U',
                                        style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primary),
                                      ),
                                    ),
                                    if (isOnline)
                                      Positioned(
                                        right: 0,
                                        bottom: 0,
                                        child: Container(
                                          width: 10,
                                          height: 10,
                                          decoration: BoxDecoration(
                                            color: AppTheme.success,
                                            shape: BoxShape.circle,
                                            border: Border.all(color: AppTheme.surfaceCard, width: 2),
                                          ),
                                        ),
                                      ),
                                  ],
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Text(
                                            sub.username,
                                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, fontFamily: 'monospace'),
                                          ),
                                          const SizedBox(width: 6),
                                          StatusBadge(status: sub.status),
                                        ],
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        '${sub.name} · ${sub.package?.name ?? "No Plan"}',
                                        style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        'Speed: ${sub.downloadSpeedLimit}M/${sub.uploadSpeedLimit}M · Exp: ${Formatters.date(sub.expiryDate)}',
                                        style: const TextStyle(fontSize: 10, color: AppTheme.textMuted),
                                      ),
                                    ],
                                  ),
                                ),
                                const Icon(Icons.chevron_right, size: 18, color: AppTheme.textMuted),
                              ],
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
                onRetry: () => ref.refresh(subscribersProvider),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, String? status) {
    final isSelected = _statusFilter == status;
    return Padding(
      padding: const EdgeInsets.only(right: 6.0),
      child: FilterChip(
        label: Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: isSelected ? Colors.white : AppTheme.textSecondary)),
        selected: isSelected,
        onSelected: (_) => setState(() => _statusFilter = status),
        backgroundColor: AppTheme.surfaceCard,
        selectedColor: AppTheme.primary,
        showCheckmark: false,
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: const BorderSide(color: AppTheme.border)),
      ),
    );
  }
}
