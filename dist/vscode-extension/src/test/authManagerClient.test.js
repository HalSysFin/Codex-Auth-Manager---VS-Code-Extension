"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const authManagerClient_1 = require("../authManagerClient");
const authManagerClient_2 = require("../authManagerClient");
(0, node_test_1.default)('normalizeBackendErrorPayload prefers detail', () => {
    strict_1.default.deepEqual((0, authManagerClient_1.normalizeBackendErrorPayload)({ detail: 'Bad token' }), { message: 'Bad token' });
});
(0, node_test_1.default)('normalizeBackendErrorPayload falls back to reason', () => {
    strict_1.default.deepEqual((0, authManagerClient_1.normalizeBackendErrorPayload)({ reason: 'no_eligible_credentials_available' }), {
        message: 'no_eligible_credentials_available',
        code: 'no_eligible_credentials_available',
    });
});
(0, node_test_1.default)('materialize uses shared materialize endpoint path', async () => {
    let requestedUrl = '';
    let authHeader = '';
    const client = new authManagerClient_2.AuthManagerClient({
        baseUrl: 'http://127.0.0.1:8080',
        internalApiToken: 'secret-token',
        allowInsecureLocalhost: true,
        fetchImpl: async (input, init) => {
            requestedUrl = String(input);
            authHeader = String((init?.headers).Authorization);
            return new Response(JSON.stringify({ status: 'ok', reason: null, lease: null, credential_material: null }), { status: 200 });
        },
    });
    await client.fetchAuthPayloadForLease('lease-123', {
        machineId: 'machine-a',
        agentId: 'vscode-extension',
    });
    strict_1.default.equal(requestedUrl, 'http://127.0.0.1:8080/api/leases/lease-123/materialize');
    strict_1.default.equal(authHeader, 'Bearer secret-token');
});
(0, node_test_1.default)('shared client surfaces invalid bearer token responses', async () => {
    const client = new authManagerClient_2.AuthManagerClient({
        baseUrl: 'http://127.0.0.1:8080',
        internalApiToken: 'bad-token',
        allowInsecureLocalhost: true,
        fetchImpl: async () => new Response(JSON.stringify({ detail: 'Invalid bearer token' }), { status: 403 }),
    });
    await strict_1.default.rejects(client.getLease('lease-123'), (error) => error instanceof authManagerClient_2.AuthManagerClientError && error.status === 403 && error.message === 'Invalid bearer token');
});
(0, node_test_1.default)('shared client handles missing bearer token responses', async () => {
    const client = new authManagerClient_2.AuthManagerClient({
        baseUrl: 'http://127.0.0.1:8080',
        internalApiToken: '',
        allowInsecureLocalhost: true,
        fetchImpl: async () => new Response(JSON.stringify({ detail: 'Missing bearer token' }), { status: 401 }),
    });
    await strict_1.default.rejects(client.acquireLease({
        machineId: 'machine-a',
        agentId: 'vscode-extension',
    }), (error) => error instanceof authManagerClient_2.AuthManagerClientError && error.status === 401 && error.message === 'Missing bearer token');
});
//# sourceMappingURL=authManagerClient.test.js.map