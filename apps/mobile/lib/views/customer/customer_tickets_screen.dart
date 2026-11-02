import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../core/constants/api_constants.dart';
import '../../providers/auth_provider.dart';
import '../../providers/data_providers.dart';
import '../widgets/widgets.dart';

class CustomerTicketsScreen extends ConsumerStatefulWidget {
  const CustomerTicketsScreen({super.key});

  @override
  ConsumerState<CustomerTicketsScreen> createState() => _CustomerTicketsScreenState();
}

class _CustomerTicketsScreenState extends ConsumerState<CustomerTicketsScreen> {
  final _subjectController = TextEditingController();
  final _descriptionController = TextEditingController();
  String _category = 'SPEED_ISSUE';
  bool _isCreating = false;

  Future<void> _createTicket() async {
    if (_subjectController.text.trim().isEmpty || _descriptionController.text.trim().isEmpty) return;
    setState(() => _isCreating = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.post(ApiConstants.tickets, data: {
        'subject': _subjectController.text.trim(),
        'description': _descriptionController.text.trim(),
        'category': _category,
        'priority': 'MEDIUM',
      });
      _subjectController.clear();
      _descriptionController.clear();
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Support ticket filed successfully!'), backgroundColor: AppTheme.success),
        );
      }
      ref.invalidate(ticketsProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString()}'), backgroundColor: AppTheme.error),
        );
      }
    } finally {
      if (mounted) setState(() => _isCreating = false);
    }
  }

  void _showNewTicketSheet() {
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
              const Text('Open Support Ticket', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              TextField(
                controller: _subjectController,
                decoration: const InputDecoration(labelText: 'Subject Title', hintText: 'e.g. WiFi Router Slow Speed'),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _category,
                decoration: const InputDecoration(labelText: 'Category'),
                dropdownColor: AppTheme.surfaceCard,
                items: const [
                  DropdownMenuItem(value: 'SPEED_ISSUE', child: Text('Speed Degradation')),
                  DropdownMenuItem(value: 'NO_INTERNET', child: Text('Complete Outage')),
                  DropdownMenuItem(value: 'BILLING', child: Text('Billing Query')),
                ],
                onChanged: (v) => setSheetState(() => _category = v ?? 'SPEED_ISSUE'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _descriptionController,
                maxLines: 3,
                decoration: const InputDecoration(labelText: 'Issue Description'),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isCreating ? null : _createTicket,
                  child: _isCreating
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Text('Submit Ticket'),
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
    final ticketsAsync = ref.watch(ticketsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Helpdesk Support'),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showNewTicketSheet,
        icon: const Icon(Icons.add),
        label: const Text('New Ticket'),
        backgroundColor: AppTheme.primary,
        foregroundColor: Colors.white,
      ),
      body: ticketsAsync.when(
        data: (tickets) {
          if (tickets.isEmpty) {
            return const EmptyStateView(
              title: 'No Support Tickets',
              message: 'Need help? Tap the button below to submit a technical query.',
              icon: Icons.support_agent_outlined,
            );
          }

          return RefreshIndicator(
            onRefresh: () => ref.refresh(ticketsProvider.future),
            child: ListView.builder(
              padding: const EdgeInsets.all(16.0),
              itemCount: tickets.length,
              itemBuilder: (context, index) {
                final t = tickets[index];
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
                            Text(t.ticketNumber, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, fontFamily: 'monospace')),
                            StatusBadge(status: t.status),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(t.subject, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white)),
                        const SizedBox(height: 4),
                        Text(t.description, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                        const SizedBox(height: 10),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('Filed: ${Formatters.date(t.createdAt)}', style: const TextStyle(fontSize: 10, color: AppTheme.textMuted)),
                            Text('${t.comments?.length ?? 0} comments', style: const TextStyle(fontSize: 11, color: AppTheme.primary)),
                          ],
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
          onRetry: () => ref.refresh(ticketsProvider),
        ),
      ),
    );
  }
}
