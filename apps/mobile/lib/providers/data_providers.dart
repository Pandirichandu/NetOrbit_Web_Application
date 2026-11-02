import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/models.dart';
import '../core/constants/api_constants.dart';
import 'auth_provider.dart';

// Dashboard Analytics Provider
final dashboardAnalyticsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get(ApiConstants.dashboard);
  return res as Map<String, dynamic>;
});

// Subscribers List Provider
final subscribersProvider = FutureProvider<List<SubscriberModel>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get(ApiConstants.subscribers);
  final items = res['items'] as List<dynamic>? ?? [];
  return items.map((s) => SubscriberModel.fromJson(s)).toList();
});

// Single Subscriber Detail Provider
final subscriberDetailProvider = FutureProvider.family<SubscriberModel, String>((ref, id) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get('${ApiConstants.subscribers}/$id');
  return SubscriberModel.fromJson(res);
});

// Packages List Provider
final packagesProvider = FutureProvider<List<PackageModel>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get(ApiConstants.packages);
  final items = res as List<dynamic>? ?? [];
  return items.map((p) => PackageModel.fromJson(p)).toList();
});

// Invoices List Provider
final invoicesProvider = FutureProvider<List<InvoiceModel>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get(ApiConstants.invoices);
  final items = res['items'] as List<dynamic>? ?? [];
  return items.map((i) => InvoiceModel.fromJson(i)).toList();
});

// Payments List Provider
final paymentsProvider = FutureProvider<List<PaymentModel>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get(ApiConstants.payments);
  final items = res['items'] as List<dynamic>? ?? [];
  return items.map((p) => PaymentModel.fromJson(p)).toList();
});

// Active Sessions Provider
final activeSessionsProvider = FutureProvider<List<ActiveSessionModel>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get(ApiConstants.activeSessions);
  final items = res['items'] as List<dynamic>? ?? [];
  return items.map((s) => ActiveSessionModel.fromJson(s)).toList();
});

// Vouchers Provider
final vouchersProvider = FutureProvider<List<VoucherModel>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get(ApiConstants.vouchers);
  final items = res['items'] as List<dynamic>? ?? [];
  return items.map((v) => VoucherModel.fromJson(v)).toList();
});

// Routers Provider
final routersProvider = FutureProvider<List<RouterModel>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get(ApiConstants.routers);
  final items = res['items'] as List<dynamic>? ?? [];
  return items.map((r) => RouterModel.fromJson(r)).toList();
});

// NAS Devices Provider
final nasProvider = FutureProvider<List<NasModel>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get(ApiConstants.nas);
  final items = res['items'] as List<dynamic>? ?? [];
  return items.map((n) => NasModel.fromJson(n)).toList();
});

// IPAM Pools Provider
final ipamPoolsProvider = FutureProvider<List<IpPoolModel>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get(ApiConstants.ipam);
  final items = res['items'] as List<dynamic>? ?? [];
  return items.map((p) => IpPoolModel.fromJson(p)).toList();
});

// Tickets Provider
final ticketsProvider = FutureProvider<List<TicketModel>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get(ApiConstants.tickets);
  final items = res['items'] as List<dynamic>? ?? [];
  return items.map((t) => TicketModel.fromJson(t)).toList();
});

// Customer Dashboard Provider
final customerDashboardProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get(ApiConstants.customerDashboard);
  return res as Map<String, dynamic>;
});

// Customer 7-Day Usage Provider
final customerUsageProvider = FutureProvider<List<dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get(ApiConstants.customerUsage);
  return res as List<dynamic>? ?? [];
});
