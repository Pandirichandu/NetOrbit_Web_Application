import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../providers/auth_provider.dart';
import '../../providers/data_providers.dart';
import '../widgets/widgets.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final analyticsAsync = ref.watch(dashboardAnalyticsProvider);
    final sessionsAsync = ref.watch(activeSessionsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppTheme.primary,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.radar, size: 16, color: Colors.white),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('NETORBIT NOC', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                Text(
                  auth.user?.tenantName ?? 'Metro Fiber Telecom',
                  style: const TextStyle(fontSize: 10, color: AppTheme.textMuted),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.qr_code_scanner, size: 20),
            tooltip: 'Scan Voucher QR',
            onPressed: () => context.push('/admin/qr-scanner'),
          ),
          IconButton(
            icon: const Icon(Icons.refresh, size: 20),
            onPressed: () {
              ref.invalidate(dashboardAnalyticsProvider);
              ref.invalidate(activeSessionsProvider);
            },
          ),
        ],
      ),
      body: analyticsAsync.when(
        data: (data) {
          final kpis = data['kpis'] as Map<String, dynamic>? ?? {};
          final chartTrend = (data['chartTrend'] as List<dynamic>?) ?? [];

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(dashboardAnalyticsProvider);
              ref.invalidate(activeSessionsProvider);
            },
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // KPI Grid
                  GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    childAspectRatio: 1.4,
                    children: [
                      StatCard(
                        title: 'Active Users',
                        value: '${kpis['activeSubscribers'] ?? 0}',
                        subtitle: '${kpis['totalSubscribers'] ?? 0} total subs',
                        icon: Icons.people,
                        iconColor: AppTheme.primary,
                        change: '+12%',
                      ),
                      StatCard(
                        title: 'Online Sessions',
                        value: '${kpis['onlineUsers'] ?? 0}',
                        subtitle: 'PPPoE & Hotspot',
                        icon: Icons.sensors,
                        iconColor: AppTheme.success,
                        change: 'Live',
                      ),
                      StatCard(
                        title: 'Monthly Revenue',
                        value: Formatters.currency(kpis['monthlyRevenue'] ?? 0),
                        subtitle: 'Pending: ${Formatters.currency(kpis['pendingAmount'] ?? 0)}',
                        icon: Icons.currency_rupee,
                        iconColor: AppTheme.purple,
                      ),
                      StatCard(
                        title: 'NAS & Routers',
                        value: '${kpis['activeNas'] ?? 0}/${kpis['totalNas'] ?? 0}',
                        subtitle: 'SLA: 99.8%',
                        icon: Icons.router,
                        iconColor: AppTheme.warning,
                        change: 'Online',
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Revenue Trend fl_chart
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'REVENUE VELOCITY (LAST 7 DAYS)',
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.textMuted),
                          ),
                          const SizedBox(height: 16),
                          SizedBox(
                            height: 180,
                            child: LineChart(
                              LineChartData(
                                gridData: FlGridData(
                                  show: true,
                                  getDrawingHorizontalLine: (_) => const FlLine(color: AppTheme.border, strokeWidth: 1),
                                  drawVerticalLine: false,
                                ),
                                titlesData: FlTitlesData(
                                  show: true,
                                  bottomTitles: AxisTitles(
                                    sideTitles: SideTitles(
                                      showTitles: true,
                                      getTitlesWidget: (val, meta) {
                                        final idx = val.toInt();
                                        if (idx >= 0 && idx < chartTrend.length) {
                                          return Padding(
                                            padding: const EdgeInsets.only(top: 6.0),
                                            child: Text(
                                              chartTrend[idx]['day'] ?? '',
                                              style: const TextStyle(fontSize: 9, color: AppTheme.textMuted),
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
                                      reservedSize: 36,
                                      getTitlesWidget: (val, meta) {
                                        return Text('₹${val.toInt()}', style: const TextStyle(fontSize: 8, color: AppTheme.textMuted));
                                      },
                                    ),
                                  ),
                                  topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                                  rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                                ),
                                borderData: FlBorderData(show: false),
                                lineBarsData: [
                                  LineChartBarData(
                                    spots: chartTrend.asMap().entries.map((e) {
                                      final num rev = e.value['revenue'] ?? 0;
                                      return FlSpot(e.key.toDouble(), rev.toDouble());
                                    }).toList(),
                                    isCurved: true,
                                    color: AppTheme.primary,
                                    barWidth: 2.5,
                                    belowBarData: BarAreaData(
                                      show: true,
                                      color: AppTheme.primary.withValues(alpha: 0.15),
                                    ),
                                    dotData: const FlDotData(show: false),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Real-time Active Sessions Snapshot
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Active RADIUS Sessions', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white)),
                      TextButton(
                        onPressed: () => context.push('/admin/sessions'),
                        child: const Text('View All', style: TextStyle(fontSize: 12)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  sessionsAsync.when(
                    data: (sessions) {
                      if (sessions.isEmpty) {
                        return const Card(
                          child: Padding(
                            padding: EdgeInsets.all(20.0),
                            child: Center(
                              child: Text('No active sessions online', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                            ),
                          ),
                        );
                      }

                      return Column(
                        children: sessions.take(4).map((s) {
                          return Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: ListTile(
                              leading: Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: AppTheme.success.withValues(alpha: 0.15),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.wifi_tethering, size: 16, color: AppTheme.success),
                              ),
                              title: Text(s.username, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, fontFamily: 'monospace')),
                              subtitle: Text(
                                '${s.framedIpAddress ?? "Dynamic IP"} · ${s.rateLimit ?? "100M"}',
                                style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                              ),
                              trailing: Text(
                                Formatters.duration(s.sessionDuration),
                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.primary),
                              ),
                            ),
                          );
                        }).toList(),
                      );
                    },
                    loading: () => const Center(child: CircularProgressIndicator()),
                    error: (err, _) => Text(err.toString(), style: const TextStyle(color: AppTheme.error, fontSize: 12)),
                  ),
                ],
              ),
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
