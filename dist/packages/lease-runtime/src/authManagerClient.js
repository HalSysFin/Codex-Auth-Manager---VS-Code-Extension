export class AuthManagerClientError extends Error {
    status;
    code;
    constructor(message, status, code) {
        super(message);
        this.name = 'AuthManagerClientError';
        this.status = status;
        this.code = code;
    }
}
export function normalizeBackendErrorPayload(payload) {
    if (!payload || typeof payload !== 'object') {
        return { message: 'Unknown backend error' };
    }
    const record = payload;
    const detail = record.detail;
    if (typeof detail === 'string' && detail.trim()) {
        return { message: detail };
    }
    const reason = record.reason;
    if (typeof reason === 'string' && reason.trim()) {
        return { message: reason, code: reason };
    }
    const message = record.message;
    if (typeof message === 'string' && message.trim()) {
        return { message };
    }
    return { message: 'Unknown backend error' };
}
function sanitizeBaseUrl(raw, allowInsecureLocalhost) {
    const parsed = new URL(raw);
    const localHosts = new Set(['127.0.0.1', 'localhost', '::1']);
    const isLocalhost = localHosts.has(parsed.hostname);
    if (parsed.protocol !== 'https:' && !(allowInsecureLocalhost && isLocalhost)) {
        throw new Error(`Refusing insecure Auth Manager URL: ${parsed.toString()}`);
    }
    return parsed.toString().replace(/\/+$/, '');
}
export class AuthManagerClient {
    baseUrl;
    internalApiToken;
    fetchImpl;
    constructor(options) {
        this.baseUrl = sanitizeBaseUrl(options.baseUrl, Boolean(options.allowInsecureLocalhost));
        this.internalApiToken = options.internalApiToken?.trim() || undefined;
        this.fetchImpl = options.fetchImpl ?? fetch;
    }
    async acquireLease(input) {
        return this.request('/api/leases/acquire', {
            method: 'POST',
            body: {
                machine_id: input.machineId,
                agent_id: input.agentId,
                requested_ttl_seconds: input.requestedTtlSeconds,
                reason: input.reason,
            },
        });
    }
    async getLease(leaseId) {
        return this.request(`/api/leases/${encodeURIComponent(leaseId)}`, {
            method: 'GET',
        });
    }
    async renewLease(leaseId, input) {
        return this.request(`/api/leases/${encodeURIComponent(leaseId)}/renew`, {
            method: 'POST',
            body: {
                machine_id: input.machineId,
                agent_id: input.agentId,
            },
        });
    }
    async releaseLease(leaseId, input) {
        return this.request(`/api/leases/${encodeURIComponent(leaseId)}/release`, {
            method: 'POST',
            body: {
                machine_id: input.machineId,
                agent_id: input.agentId,
                reason: input.reason,
            },
        });
    }
    async rotateLease(input) {
        return this.request('/api/leases/rotate', {
            method: 'POST',
            body: {
                lease_id: input.leaseId,
                machine_id: input.machineId,
                agent_id: input.agentId,
                reason: input.reason,
            },
        });
    }
    async postTelemetry(leaseId, payload) {
        return this.request(`/api/leases/${encodeURIComponent(leaseId)}/telemetry`, {
            method: 'POST',
            body: payload,
        });
    }
    async materializeLease(leaseId, input) {
        return this.request(`/api/leases/${encodeURIComponent(leaseId)}/materialize`, {
            method: 'POST',
            body: {
                machine_id: input.machineId,
                agent_id: input.agentId,
            },
        });
    }
    async request(path, options) {
        const headers = {
            Accept: 'application/json',
        };
        if (this.internalApiToken) {
            headers.Authorization = `Bearer ${this.internalApiToken}`;
        }
        let body;
        if (options.body !== undefined) {
            headers['Content-Type'] = 'application/json';
            body = JSON.stringify(options.body);
        }
        const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
            method: options.method,
            headers,
            body,
        });
        const raw = await response.text();
        let parsed = null;
        if (raw.trim()) {
            try {
                parsed = JSON.parse(raw);
            }
            catch {
                parsed = raw;
            }
        }
        if (!response.ok) {
            const normalized = normalizeBackendErrorPayload(parsed);
            throw new AuthManagerClientError(normalized.message, response.status, normalized.code);
        }
        return parsed;
    }
}
//# sourceMappingURL=authManagerClient.js.map