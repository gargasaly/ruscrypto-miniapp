import "server-only";

type SupabaseRequestOptions = {
  body?: unknown;
  headers?: HeadersInit;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  prefer?: string;
};

export type SupabaseResult<T> = {
  data: T | null;
  error: string | null;
  status: number | null;
};

export type SupabaseAdminClient = {
  isConfigured: true;
  request: <T>(path: string, options?: SupabaseRequestOptions) => Promise<SupabaseResult<T>>;
};

export type MissingSupabaseClient = {
  isConfigured: false;
  reason: "missing-supabase-env";
};

export function getSupabaseAdminClient(): SupabaseAdminClient | MissingSupabaseClient {
  const url = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    return {
      isConfigured: false,
      reason: "missing-supabase-env",
    };
  }

  const baseUrl = url.replace(/\/+$/, "");

  return {
    isConfigured: true,
    async request<T>(path: string, options: SupabaseRequestOptions = {}) {
      const endpoint = new URL(path, `${baseUrl}/`);
      const response = await fetch(endpoint, {
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        cache: "no-store",
        headers: {
          accept: "application/json",
          apikey: serviceRoleKey,
          authorization: `Bearer ${serviceRoleKey}`,
          ...(options.body === undefined ? {} : { "content-type": "application/json" }),
          ...(options.prefer ? { prefer: options.prefer } : {}),
          ...(options.headers ?? {}),
        },
        method: options.method ?? "GET",
      });

      const text = await response.text();
      const data = text ? (JSON.parse(text) as unknown) : null;

      if (!response.ok) {
        const message =
          typeof data === "object" && data && "message" in data
            ? String((data as { message?: unknown }).message)
            : `supabase-http-${response.status}`;

        return {
          data: null,
          error: message,
          status: response.status,
        };
      }

      return {
        data: data as T,
        error: null,
        status: response.status,
      };
    },
  };
}
