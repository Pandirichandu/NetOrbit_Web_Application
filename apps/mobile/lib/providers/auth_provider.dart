import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/models.dart';
import '../core/storage/secure_storage_service.dart';
import '../core/network/api_client.dart';
import '../core/constants/api_constants.dart';

final secureStorageProvider = Provider<SecureStorageService>((ref) {
  return SecureStorageService();
});

final apiClientProvider = Provider<ApiClient>((ref) {
  final storage = ref.watch(secureStorageProvider);
  return ApiClient(storage: storage);
});

class AuthState {
  final UserModel? user;
  final String? token;
  final bool isLoading;
  final String? error;

  AuthState({
    this.user,
    this.token,
    this.isLoading = false,
    this.error,
  });

  bool get isAuthenticated => user != null && token != null;
  bool get isCustomer => user?.isCustomer ?? false;

  AuthState copyWith({
    UserModel? user,
    String? token,
    bool? isLoading,
    String? error,
    bool clearUser = false,
  }) {
    return AuthState(
      user: clearUser ? null : (user ?? this.user),
      token: clearUser ? null : (token ?? this.token),
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final ApiClient _api;
  final SecureStorageService _storage;

  AuthNotifier({
    required ApiClient api,
    required SecureStorageService storage,
  })  : _api = api,
        _storage = storage,
        super(AuthState(isLoading: true)) {
    _initAuth();
  }

  Future<void> _initAuth() async {
    try {
      final token = await _storage.getAccessToken();
      final userJson = await _storage.getUser();

      if (token != null && userJson != null) {
        final Map<String, dynamic> map = jsonDecode(userJson);
        final user = UserModel.fromJson(map);
        state = AuthState(user: user, token: token, isLoading: false);
      } else {
        state = AuthState(isLoading: false);
      }
    } catch (_) {
      state = AuthState(isLoading: false);
    }
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final res = await _api.post(ApiConstants.login, data: {
        'email': email,
        'password': password,
      });

      final userMap = res['user'] as Map<String, dynamic>;
      final tokensMap = res['tokens'] as Map<String, dynamic>;

      final user = UserModel.fromJson(userMap);
      final accessToken = tokensMap['accessToken'] as String;
      final refreshToken = tokensMap['refreshToken'] as String;

      await _storage.saveTokens(
        accessToken: accessToken,
        refreshToken: refreshToken,
      );
      await _storage.saveUser(jsonEncode(user.toJson()));
      if (user.tenantId != null) {
        await _storage.saveTenantId(user.tenantId!);
      }

      state = AuthState(user: user, token: accessToken, isLoading: false);
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString().replaceAll('Exception:', '').trim(),
      );
      return false;
    }
  }

  Future<void> switchDemoUser(String roleKey) async {
    const demoAccounts = {
      'SUPER_ADMIN': 'admin@netorbit.local',
      'TENANT_ADMIN': 'tenant@netorbit.local',
      'NETWORK_ADMIN': 'network@netorbit.local',
      'BILLING_EXECUTIVE': 'billing@netorbit.local',
      'CUSTOMER_SUPPORT': 'support@netorbit.local',
      'CUSTOMER': 'customer@netorbit.local',
    };

    final email = demoAccounts[roleKey] ?? 'admin@netorbit.local';
    await login(email, 'NetOrbit@2026!');
  }

  Future<void> logout() async {
    await _storage.clearAll();
    state = AuthState(isLoading: false);
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final api = ref.watch(apiClientProvider);
  final storage = ref.watch(secureStorageProvider);
  return AuthNotifier(api: api, storage: storage);
});
