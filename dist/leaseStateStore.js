"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaseStateStore = void 0;
exports.defaultLeaseState = defaultLeaseState;
exports.derivePersistedMachineId = derivePersistedMachineId;
exports.derivePersistedAgentId = derivePersistedAgentId;
const node_crypto_1 = require("node:crypto");
const os = __importStar(require("node:os"));
const STATE_KEY = 'authManager.leaseState';
const MACHINE_ID_KEY = 'authManager.machineId';
const AGENT_ID_KEY = 'authManager.agentId';
function defaultLeaseState(machineId, agentId) {
    return {
        machineId,
        agentId,
        leaseId: null,
        credentialId: null,
        issuedAt: null,
        expiresAt: null,
        leaseState: null,
        latestTelemetryAt: null,
        latestUtilizationPct: null,
        latestQuotaRemaining: null,
        lastAuthWriteAt: null,
        lastBackendRefreshAt: null,
        replacementRequired: false,
        rotationRecommended: false,
        lastErrorAt: null,
    };
}
function derivePersistedMachineId(configured) {
    const trimmed = configured?.trim();
    if (trimmed) {
        return trimmed;
    }
    return `vscode-${os.hostname().replace(/[^a-zA-Z0-9._-]/g, '-')}-${(0, node_crypto_1.randomUUID)().slice(0, 8)}`;
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
    async getOrCreateMachineId(configured) {
        const existing = this.memento.get(MACHINE_ID_KEY);
        if (existing?.trim()) {
            return existing;
        }
        const machineId = derivePersistedMachineId(configured);
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
    load(machineId, agentId) {
        const stored = this.memento.get(STATE_KEY);
        return {
            ...defaultLeaseState(machineId, agentId),
            ...stored,
            machineId,
            agentId,
        };
    }
    async save(state) {
        await this.memento.update(STATE_KEY, state);
    }
    async clear(machineId, agentId) {
        const next = defaultLeaseState(machineId, agentId);
        await this.save(next);
        return next;
    }
    async updateFromLease(state, lease) {
        const next = {
            ...state,
            leaseId: lease.id,
            credentialId: lease.credential_id,
            issuedAt: lease.issued_at,
            expiresAt: lease.expires_at,
            leaseState: lease.state,
            latestTelemetryAt: lease.last_telemetry_at,
            latestUtilizationPct: lease.latest_utilization_pct,
            latestQuotaRemaining: lease.latest_quota_remaining,
            lastBackendRefreshAt: new Date().toISOString(),
        };
        await this.save(next);
        return next;
    }
    async updateFromLeaseStatus(state, status) {
        const next = {
            ...state,
            leaseId: status.lease_id,
            credentialId: status.credential_id,
            issuedAt: status.issued_at,
            expiresAt: status.expires_at,
            leaseState: status.state,
            latestTelemetryAt: status.latest_telemetry_at,
            latestUtilizationPct: status.latest_utilization_pct,
            latestQuotaRemaining: status.latest_quota_remaining,
            lastBackendRefreshAt: new Date().toISOString(),
            replacementRequired: status.replacement_required,
            rotationRecommended: status.rotation_recommended,
        };
        await this.save(next);
        return next;
    }
    async recordAuthWrite(state, atIso) {
        const next = { ...state, lastAuthWriteAt: atIso };
        await this.save(next);
        return next;
    }
    async recordError(state, atIso) {
        const next = { ...state, lastErrorAt: atIso };
        await this.save(next);
        return next;
    }
}
exports.LeaseStateStore = LeaseStateStore;
//# sourceMappingURL=leaseStateStore.js.map