// frontend/src/utils/api.ts  — one place for all backend calls
export const API_URL =
    (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000';

export class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }
}

function authHeader(): Record<string, string> {
    const t = localStorage.getItem('finagent_token');
    return t ? { Authorization: `Bearer ${t}` } : {};
}

function errorText(data: any, fallback: string): string {
    const d = data?.detail;
    if (typeof d === 'string') return d;
    if (Array.isArray(d)) return d.map((x) => `${(x.loc || []).slice(-1)[0]}: ${x.msg}`).join('; ');
    return fallback;
}

function handle401(status: number) {
    if (status === 401) {
        ['finagent_token', 'finagent_role', 'finagent_name', 'finagent_is_primary'].forEach((k) =>
            localStorage.removeItem(k)
        );
        window.location.href = '/login';
    }
}

export async function api<T = any>(
    path: string,
    opts: { method?: string; json?: unknown; form?: FormData } = {}
): Promise<T> {
    const headers: Record<string, string> = { ...authHeader() };
    let body: BodyInit | undefined;
    if (opts.form) {
        body = opts.form; // browser sets multipart boundary itself
    } else if (opts.json !== undefined) {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(opts.json);
    }
    let res: Response;
    try {
        res = await fetch(`${API_URL}${path}`, { method: opts.method ?? 'GET', headers, body });
    } catch {
        throw new ApiError('Cannot reach the backend. Is the server running?', 0);
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        handle401(res.status);
        throw new ApiError(errorText(data, `Request failed (${res.status})`), res.status);
    }
    return data as T;
}

export async function downloadFile(path: string, filename: string) {
    const res = await fetch(`${API_URL}${path}`, { headers: authHeader() });
    if (!res.ok) {
        handle401(res.status);
        throw new ApiError(`Download failed (${res.status})`, res.status);
    }
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

export const money = (n: number | null | undefined) =>
    n === null || n === undefined
        ? '-'
        : 'Rs. ' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });