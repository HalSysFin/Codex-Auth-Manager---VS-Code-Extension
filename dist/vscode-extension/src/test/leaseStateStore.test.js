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
    let state = store.load(machineId, agentId, '~/.codex/auth.json');
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
        metadata: { label: 'max' },
        created_at: '2026-03-22T00:00:00.000Z',
        updated_at: '2026-03-22T00:00:00.000Z',
    });
    strict_1.default.equal(state.leaseId, 'lease-1');
    strict_1.default.equal(state.credentialId, 'cred-1');
    strict_1.default.equal(state.accountLabel, 'max');
    strict_1.default.equal(state.latestUtilizationPct, 12);
    strict_1.default.equal(state.authFilePath, '~/.codex/auth.json');
    strict_1.default.ok(state.lastBackendRefreshAt);
});
(0, node_test_1.default)('derivePersistedMachineId prefers runtime machine fingerprint when config is blank', () => {
    strict_1.default.equal((0, leaseStateStore_1.derivePersistedMachineId)('', 'runtime-machine-id'), 'vscode-runtime-machine-id');
});
(0, node_test_1.default)('derivePersistedMachineId includes host context for remote targets', () => {
    strict_1.default.equal((0, leaseStateStore_1.derivePersistedMachineId)('', 'runtime-machine-id', 'ssh-remote+server-a'), 'vscode-runtime-machine-id-ssh-remote-server-a');
});
(0, node_test_1.default)('derivePersistedMachineId includes remote name plus hostname context', () => {
    strict_1.default.equal((0, leaseStateStore_1.derivePersistedMachineId)('', 'runtime-machine-id', 'ssh-remote+debian'), 'vscode-runtime-machine-id-ssh-remote-debian');
});
(0, node_test_1.default)('getOrCreateMachineId replaces legacy generated ids with runtime fingerprint ids', async () => {
    const memento = new MemoryMemento();
    await memento.update('authManager.machineId', 'vscode-oldhost-1a2b3c4d');
    const store = new leaseStateStore_1.LeaseStateStore(memento);
    const machineId = await store.getOrCreateMachineId('', 'runtime-machine-id', 'ssh-remote+server-a');
    strict_1.default.equal(machineId, 'vscode-runtime-machine-id-ssh-remote-server-a');
});
(0, node_test_1.default)('getOrCreateMachineId honors configured ids over persisted ids', async () => {
    const memento = new MemoryMemento();
    await memento.update('authManager.machineId', 'old-machine');
    const store = new leaseStateStore_1.LeaseStateStore(memento);
    const machineId = await store.getOrCreateMachineId('new-machine', 'runtime-machine-id', 'ssh-remote+server-a');
    strict_1.default.equal(machineId, 'new-machine');
});
(0, node_test_1.default)('load clears stale lease state when machine id changes', async () => {
    const store = new leaseStateStore_1.LeaseStateStore(new MemoryMemento());
    await store.save({
        ...store.load('machine-a', 'agent-a', '~/.codex/auth.json'),
        leaseId: 'lease-1',
        leaseState: 'active',
    });
    const state = store.load('machine-b', 'agent-a', '~/.codex/auth.json');
    strict_1.default.equal(state.machineId, 'machine-b');
    strict_1.default.equal(state.leaseId, null);
    strict_1.default.equal(state.leaseState, null);
});
(0, node_test_1.default)('getOrCreateMachineId changes across remote hosts for the same local client', async () => {
    const store = new leaseStateStore_1.LeaseStateStore(new MemoryMemento());
    const machineA = await store.getOrCreateMachineId('', 'runtime-machine-id', 'ssh-remote+server-a');
    const machineB = await store.getOrCreateMachineId('', 'runtime-machine-id', 'ssh-remote+server-b');
    strict_1.default.equal(machineA, 'vscode-runtime-machine-id-ssh-remote-server-a');
    strict_1.default.equal(machineB, 'vscode-runtime-machine-id-ssh-remote-server-b');
});
(0, node_test_1.default)('getOrCreateMachineId replaces generic remote ids with host-specific ids', async () => {
    const memento = new MemoryMemento();
    await memento.update('authManager.machineId', 'vscode-runtime-machine-id-ssh-remote');
    const store = new leaseStateStore_1.LeaseStateStore(memento);
    const machineId = await store.getOrCreateMachineId('', 'runtime-machine-id', 'ssh-remote+debian');
    strict_1.default.equal(machineId, 'vscode-runtime-machine-id-ssh-remote-debian');
});
//# sourceMappingURL=leaseStateStore.test.js.map