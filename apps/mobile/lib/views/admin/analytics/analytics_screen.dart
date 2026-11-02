import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../providers/data_providers.dart';
import '../../widgets/widgets.dart';

class AnalyticsScreen extends ConsumerWidget {
  const AnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final analyticsAsync = ref.watch(dashboardAnalyticsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Intelligence & ARPU'),
      ),
      body: analyticsAsync.when(
        data: (data) {
          final kpis = data['kpis'] as Map<String, dynamic>? ?? {};

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: 1.4,
                  children: [
                    StatCard(
                      title: 'ARPU Metric',
                      value: Formatters.currency(kpis['arpu'] ?? 104.76),
                      subtitle: '+8.4% vs last Qtr',
                      icon: Icons.trending_up,
                      iconColor: AppTheme.success,
                    ),
                    const StatCard(
                      title: 'Retention Rate',
                      value: '94.2%',
                      subtitle: 'Auto-renewal rate',
                      icon: Icons.repeat,
                      iconColor: AppTheme.primary,
                    ),
                    const StatCard(
                      title: 'Estimated Churn',
                      value: '1.8%',
                      subtitle: 'Target < 3.5%',
                      icon: Icons.person_remove_outlined,
                      iconColor: AppTheme.warning,
                    ),
                    const StatCard(
                      title: 'SLA Score',
                      value: '99.8%',
                      subtitle: 'Core uptime',
                      icon: Icons.verified_outlined,
                      iconColor: AppTheme.purple,
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Hourly Concurrency Pattern
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'PEAK HOURLY CONCURRENCY',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.textMuted),
                        ),
                        const SizedBox(height: 16),
                        SizedBox(
                          height: 160,
                          child: BarChart(
                            BarChartData(
                              alignment: BarChartAlignment.spaceAround,
                              maxY: 12,
                              titlesData: const FlTitlesData(
                                show: true,
                                topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                                rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                              ),
                              gridData: FlGridData(
                                show: true,
                                drawVerticalLine: false,
                                getDrawingHorizontalLine: (_) => const FlLine(color: AppTheme.border, strokeWidth: 1),
                              ),
                              borderData: FlBorderData(show: false),
                              barGroups: [
                                BarChartGroupData(x: 0, barRods: [BarChartRodData(toY: 3, color: AppTheme.primary, width: 12, borderRadius: BorderRadius.circular(4))]),
                                BarChartGroupData(x: 1, barRods: [BarChartRodData(toY: 6, color: AppTheme.primary, width: 12, borderRadius: BorderRadius.circular(4))]),
                                BarChartGroupData(x: 2, barRods: [BarChartRodData(toY: 9, color: AppTheme.primary, width: 12, borderRadius: BorderRadius.circular(4))]),
                                BarChartGroupData(x: 3, barRods: [BarChartRodData(toY: 10, color: AppTheme.success, width: 12, borderRadius: BorderRadius.circular(4))]),
                                BarChartGroupData(x: 4, barRods: [BarChartRodData(toY: 9, color: AppTheme.primary, width: 12, borderRadius: BorderRadius.circular(4))]),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => ErrorStateView(
          error: err.toString(),
          onRetry: () => ref.refresh(dashboardAnalyticsProvider),
        ),
      ),
    );
  }
}
