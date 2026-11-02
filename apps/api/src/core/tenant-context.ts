import { AsyncLocalStorage } from 'async_hooks';

interface TenantStore {
  tenantId: string;
  userId: string | null;
  requestId: string;
}

const storage = new AsyncLocalStorage<TenantStore>();

export const TenantContext = {
  run(store: TenantStore, callback: () => void): void {
    storage.run(store, callback);
  },

  set(store: TenantStore): void {
    storage.enterWith(store);
  },

  getTenantId(): string {
    return storage.getStore()?.tenantId ?? '';
  },

  getUserId(): string | null {
    return storage.getStore()?.userId ?? null;
  },

  getRequestId(): string {
    return storage.getStore()?.requestId ?? '';
  },

  getStore(): TenantStore | undefined {
    return storage.getStore();
  },
};
