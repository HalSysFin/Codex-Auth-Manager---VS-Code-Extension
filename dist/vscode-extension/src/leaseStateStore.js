"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaseStateStore = void 0;
exports.defaultLeaseState = defaultLeaseState;
exports.derivePersistedMachineId = derivePersistedMachineId;
exports.derivePersistedAgentId = derivePersistedAgentId;
const node_crypto_1 = require("node:crypto");
const runtimeState_js_1 = require("../../packages/lease-runtime/src/runtimeState.js");
const STATE_KEY = 'authManager.leaseState';
const MACHINE_ID_KEY = 'authManager.machineId';
const AGENT_ID_KEY = 'authManager.agentId';
function defaultLeaseState(machineId, agentId, authFilePath = '~/.codex/auth.json') {
    return (0, runtimeState_js_1.defaultRuntimeLeaseState)(machineId, agentId, authFilePath);
}
function sanitizeMachineFragment(value) {
    const sanitized = value.replace(/[^a-zA-Z0-9._-]/g, '-');
    return sanitized.length > 32 ? sanitized.slice(0, 32) : sanitized;
}
function isLegacyGeneratedMachineId(value) {
    return /^vscode-[a-zA-Z0-9._-]+-[a-f0-9]{8}$/.test(value);
}
function derivePersistedMachineId(configured, runtimeMachineId, hostContext) {
    const trimmed = configured?.trim();
    if (trimmed) {
        return trimmed;
    }
    const runtimeTrimmed = runtimeMachineId?.trim();
    const hostTrimmed = hostContext?.trim();
    if (runtimeTrimmed) {
        const fragments = [sanitizeMachineFragment(runtimeTrimmed)];
        if (hostTrimmed) {
            fragments.push(sanitizeMachineFragment(hostTrimmed));
        }
        return `vscode-${fragments.join('-')}`;
    }
    if (hostTrimmed) {
        return `vscode-${sanitizeMachineFragment(hostTrimmed)}-${(0, node_crypto_1.randomUUID)().slice(0, 8)}`;
    }
    return `vscode-${(0, node_crypto_1.randomUUID)().slice(0, 12)}`;
}
function derivePersistedAgentId(configured) {
    const trimmed = configured?.trim();
    if (trimmed) {
        return trimmed;
    }
    return 'vscode-extension';
}
class LeaseStateStore {
    memento;
    constructor(memento) {
        this.memento = memento;
    }
    async getOrCreateMachineId(configured, runtimeMachineId, hostContext) {
        const configuredTrimmed = configured?.trim();
        if (configuredTrimmed) {
            await this.memento.update(MACHINE_ID_KEY, configuredTrimmed);
            return configuredTrimmed;
        }
        const existing = this.memento.get(MACHINE_ID_KEY)?.trim();
        const derivedRuntimeId = runtimeMachineId?.trim() || hostContext?.trim()
            ? derivePersistedMachineId(undefined, runtimeMachineId, hostContext)
            : undefined;
        if (derivedRuntimeId) {
            if (!existing || isLegacyGeneratedMachineId(existing) || existing !== derivedRuntimeId) {
                await this.memento.update(MACHINE_ID_KEY, derivedRuntimeId);
                return derivedRuntimeId;
            }
            return existing;
        }
        if (existing) {
            return existing;
        }
        const machineId = derivePersistedMachineId();
        await this.memento.update(MACHINE_ID_KEY, machineId);
        return machineId;
    }
    async getOrCreateAgentId(configured) {
        const existing = this.memento.get(AGENT_ID_KEY);
        if (existing?.trim()) {
            return existing;
        }
        const agentId = derivePersistedAgentId(configured);
        await this.memento.update(AGENT_ID_KEY, agentId);
        return agentId;
    }
    load(machineId, agentId, authFilePath = '~/.codex/auth.json') {
        const stored = this.memento.get(STATE_KEY);
        if (!stored || stored.machineId !== machineId || stored.agentId !== agentId) {
            return defaultLeaseState(machineId, agentId, authFilePath);
        }
        return {
            ...defaultLeaseState(machineId, agentId, authFilePath),
            ...stored,
            machineId,
            agentId,
            authFilePath,
        };
    }
    async save(state) {
        await this.memento.update(STATE_KEY, state);
    }
    async clear(machineId, agentId, authFilePath = '~/.codex/auth.json') {
        const next = defaultLeaseState(machineId, agentId, authFilePath);
        await this.save(next);
        return next;
    }
    async updateFromLease(state, lease) {
        const next = (0, runtimeState_js_1.updateRuntimeStateFromLease)(state, lease);
        await this.save(next);
        return next;
    }
    async updateFromLeaseStatus(state, status) {
        const next = (0, runtimeState_js_1.updateRuntimeStateFromLeaseStatus)(state, status);
        await this.save(next);
        return next;
    }
    async recordAuthWrite(state, atIso) {
        const next = (0, runtimeState_js_1.recordAuthWrite)(state, atIso);
        await this.save(next);
        return next;
    }
    async recordError(state, atIso) {
        const next = (0, runtimeState_js_1.recordError)(state, atIso);
        await this.save(next);
        return next;
    }
}
exports.LeaseStateStore = LeaseStateStore;
//# sourceMappingURL=leaseStateStore.js.map