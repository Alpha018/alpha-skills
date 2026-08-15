import { z } from 'zod';

const BASE_URL = 'https://api.nextdns.io';

function getApiKey(): string {
  const key = process.env['NEXTDNS_API_KEY'];

  if (!key) {
    throw new Error(
      'NEXTDNS_API_KEY is not set. Pass it as an environment variable when ' +
        'registering this MCP server (see README.md).',
    );
  }

  return key;
}

// discriminated union, not throw/catch — one bad request shouldn't kill the server process
export type ApiResult<T> = { data: T; ok: true } | { error: ApiRequestError; ok: false };

export type ApiRequestError = {
  message: string;
  status: number;
};

const ApiErrorBodySchema = z.object({
  errors: z
    .array(
      z.object({
        code: z.string().optional(),
        detail: z.string().optional(),
        source: z.unknown().optional(),
      }),
    )
    .optional(),
});

async function toApiError(response: Response): Promise<ApiRequestError> {
  const text = await response.text();
  const parsed = ApiErrorBodySchema.safeParse(
    ((): unknown => {
      try {
        return JSON.parse(text);
      } catch {
        return undefined;
      }
    })(),
  );
  const detail = parsed.success
    ? parsed.data.errors
        ?.map((e) => e.detail ?? e.code)
        .filter(Boolean)
        .join('; ')
    : undefined;

  return {
    message: detail || text || `NextDNS API request failed with status ${response.status}`,
    status: response.status,
  };
}

type RequestOptions<T> = {
  body?: unknown;
  method: 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT';
  path: string;
  // safeParse, not parse — the API contract can drift, shouldn't crash the server
  responseSchema: z.ZodType<T>;
  searchParams?: Record<string, boolean | number | string | undefined>;
};

export async function request<T>(options: RequestOptions<T>): Promise<ApiResult<T>> {
  const url = new URL(BASE_URL + options.path);

  for (const [key, value] of Object.entries(options.searchParams ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    headers: {
      'X-Api-Key': getApiKey(),
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    method: options.method,
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });

  if (!response.ok) {
    return { error: await toApiError(response), ok: false };
  }

  // DELETE and some PATCH calls return an empty body on success.
  const text = await response.text();
  const json: unknown = text ? JSON.parse(text) : null;

  const parsed = options.responseSchema.safeParse(json);

  if (!parsed.success) {
    return {
      error: {
        message: `Response did not match the expected shape: ${parsed.error.message}`,
        status: response.status,
      },
      ok: false,
    };
  }

  return { data: parsed.data, ok: true };
}

/** Wraps the common `{"data": T}` envelope NextDNS uses on most endpoints. */
export function dataEnvelope<T extends z.ZodTypeAny>(schema: T) {
  return z.object({ data: schema });
}

export const EmptySchema = z.union([z.null(), z.object({}).passthrough()]);
