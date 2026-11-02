import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/data_providers.dart';
import '../widgets/widgets.dart';

class CustomerUsageScreen extends ConsumerWidget {
  const CustomerUsageScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final usageAsync = ref.watch(customerUsageProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Data Usage Telemetry'),
      ),
      body: usageAsync.when(
        data: (items) {
          if (items.isEmpty) {
            return const EmptyStateView(
              title: 'No Usage Records',
              message: 'Session accounting records will appear as you browse the internet.',
            );
          }

          return RefreshIndicator(
            onRefresh: () => ref.refresh(customerUsageProvider.future),
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            '7-DAY DAILY CONSUMPTION (GB)',
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.textMuted),
                          ),
                          const SizedBox(height: 20),
                          SizedBox(
                            height: 220,
                            child: BarChart(
                              BarChartData(
                                alignment: BarChartAlignment.spaceAround,
                                maxY: 25,
                                barTouchData: BarTouchData(
                                  touchTooltipData: BarTouchTooltipData(
                                    getTooltipColor: (_) => AppTheme.surfaceCard,
                                  ),
                                ),
                                titlesData: FlTitlesData(
                                  show: true,
                                  bottomTitles: AxisTitles(
                                    sideTitles: SideTitles(
                                      showTitles: true,
                                      getTitlesWidget: (value, meta) {
                                        final index = value.toInt();
                                        if (index >= 0 && index < items.length) {
                                          return Padding(
                                            padding: const EdgeInsets.only(top: 6.0),
                                            child: Text(
                                              items[index]['day'] ?? '',
                                              style: const TextStyle(fontSize: 10, color: AppTheme.textMuted),
                                            ),
                                          );
                                        }
                                        return const Text('');
                                      },
                                    ),
                                  ),
                                  leftTitles: AxisTitles(
                                    sideTitles: SideTitles(
                                      showTitles: true,
                                      reservedSize: 30,
                                      getTitlesWidget: (value, meta) {
                                        return Text(
                                          '${value.toInt()}G',
                                          style: const TextStyle(fontSize: 9, color: AppTheme.textMuted),
                                        );
                                      },
                                    ),
                                  ),
                                  topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                                  rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                                ),
                                gridData: FlGridData(
                                  show: true,
                                  drawVerticalLine: false,
                                  getDrawingHorizontalLine: (_) => const FlLine(color: AppTheme.border, strokeWidth: 1),
                                ),
                                borderData: FlBorderData(show: false),
                                barGroups: items.asMap().entries.map((e) {
                                  final idx = e.key;
                                  final item = e.value;
                                  final dl = (item['downloadGb'] as num?)?.toDouble() ?? 0.0;
                                  final ul = (item['uploadGb'] as num?)?.toDouble() ?? 0.0;

                                  return BarChartGroupData(
                                    x: idx,
                                    barRods: [
                                      BarChartRodData(toY: dl, color: AppTheme.primary, width: 8, borderRadius: BorderRadius.circular(4)),
                                      BarChartRodData(toY: ul, color: AppTheme.success, width: 8, borderRadius: BorderRadius.circular(4)),
                                    ],
                                  );
                                }).toList(),
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Row(
                                children: [
                                  Container(width: 10, height: 10, decoration: BoxDecoration(color: AppTheme.primary, borderRadius: BorderRadius.circular(2))),
                                  const SizedBox(width: 6),
                                  const Text('Download', style: TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                                ],
                              ),
                              const SizedBox(width: 20),
                              Row(
                                children: [
                                  Container(width: 10, height: 10, decoration: BoxDecoration(color: AppTheme.success, borderRadius: BorderRadius.circular(2))),
                                  const SizedBox(width: 6),
                                  const Text('Upload', style: TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                                ],
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Daily Log List
                  const Text('Daily Breakdown', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white)),
                  const SizedBox(height: 8),
                  ...items.map((item) {
                    return Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        title: Text(item['day'] ?? 'Day', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                        subtitle: Text('Upload: ${item['uploadGb']} GB', style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                        trailing: Text(
                          '${item['downloadGb']} GB Down',
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppTheme.primary),
                        ),
                      ),
                    );
                  }),
                ],
              ),
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => ErrorStateView(
          error: err.toString(),
          onRetry: () => ref.refresh(customerUsageProvider),
        ),
      ),
    );
  }
}
