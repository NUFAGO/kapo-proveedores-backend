import { AsyncLocalStorage } from 'node:async_hooks';

interface RequestContextStore {
  userToken?: string;
}

const storage = new AsyncLocalStorage<RequestContextStore>();

/** Propaga el JWT de usuario a lo largo de la petición GraphQL (HttpAuthRepository → auth). */
export function runWithRequestContext<T>(userToken: string | undefined, fn: () => T): T {
  const store: RequestContextStore = userToken ? { userToken } : {};
  return storage.run(store, fn);
}

export function getRequestUserToken(): string | undefined {
  return storage.getStore()?.userToken;
}
