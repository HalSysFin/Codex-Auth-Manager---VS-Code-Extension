"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const leaseStateStore_1 = require("../leaseStateStore");
class MemoryMemento {
    store = new Map();
    get(key, defaultValue) {
        return (this.store.has(key) ? this.store.get(key) : defaultValue);
    }
    async update(key, value) {
        this.store.set(key, value);
    }
}
(0, node_test_1.default)('derivePersistedMachineId uses configured value when present', () => {
    strict_1.default.equal((0, leaseStateStore_1.derivePersistedMachineId)('machine-a'), 'machine-a');
});
(0, node_test_1.default)('derivePersistedAgentId falls back to vscode-extension', () => {
    strict_1.default.equal((0, leaseStateStore_1.derivePersistedAgentId)(''), 'vscode-extension');
});
(0, node_test_1.default)('LeaseStateStore persists lease metadata', async () => {
    const store = new leaseStateStore_1.LeaseStateStore(new MemoryMemento());
    const machineId = await store.getOrCreateMachineId('machine-a');
    const agentId = await store.getOrCreateAgentId('agent-a');
    let state = store.load(machineId, agentId);
    state = await store.updateFromLease(state, {
        id: 'lease-1',
        credential_id: 'cred-1',
        machine_id: machineId,
        agent_id: agentId,
        state: 'active',
        issued_at: '2026-03-22T00:00:00.000Z',
        expires_at: '2026-03-22T01:00:00.000Z',
        renewed_at: null,
        revoked_at: null,
        released_at: null,
        rotation_reason: null,
        replacement_lease_id: null,
        last_telemetry_at: null,
        latest_utilization_pct: 12,
        latest_quota_remaining: 1234,
        last_success_at: null,
        last_error_at: null,
        reason: null,
        metadata: null,
        created_at: '2026-03-22T00:00:00.000Z',
        updated_at: '2026-03-22T00:00:00.000Z',
    });
    strict_1.default.equal(state.leaseId, 'lease-1');
    strict_1.default.equal(state.credentialId, 'cred-1');
    strict_1.default.equal(state.latestUtilizationPct, 12);
    strict_1.default.ok(state.lastBackendRefreshAt);
});
//# sourceMappingURL=leaseStateStore.test.js.map