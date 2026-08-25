export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Token do user guardado no localStorage, assim ele continua logado depois de recarregar a pagina
let accessToken: string | null = localStorage.getItem('baas_token');

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) localStorage.setItem('baas_token', token);
  else localStorage.removeItem('baas_token');
}

export function getAccessToken() {
  return accessToken;
}

// função central que faz toda chamada a API, monta a query string, header de auth e trata erro
async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  query?: Record<string, string | number | undefined>,
): Promise<T> {
  const url = new URL(`${API_BASE_URL}${path}`, window.location.origin);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
    });
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  // Monta a URL só pra usar o URLSearchParams, mas manda pro fetch sem o dominio (path relativo)
  const res = await fetch(url.toString().replace(window.location.origin, ''), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : undefined;

  if (!res.ok) {
    const message = Array.isArray(data?.message)
      ? data.message.join(', ')
      : (data?.message ?? `Erro ${res.status}`);
    throw new ApiError(res.status, message);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, query?: Record<string, string | number | undefined>) =>
    request<T>('GET', path, undefined, query),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
};
