"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const leaseLifecycle_1 = require("../leaseLifecycle");
const parityMatrix_js_1 = require("../../../packages/lease-runtime/src/test/parityMatrix.js");
(0, node_test_1.default)('startup with no lease needs reacquire', () => {
    strict_1.default.equal((0, leaseLifecycle_1.needsReacquire)(null), true);
});
(0, node_test_1.default)('startup with active lease stays active', () => {
    const state = (0, leaseLifecycle_1.deriveLeaseHealthState)({
        state: 'active',
        replacement_required: false,
        rotation_recommended: false,
        expires_at: '2099-01-01T00:00:00.000Z',
    }, new Date('2026-03-22T00:00:00.000Z'));
    strict_1.default.equal(state, 'active');
});
(0, node_test_1.default)('startup with revoked lease needs reacquire', () => {
    strict_1.default.equal((0, leaseLifecycle_1.needsReacquire)({ state: 'revoked' }), true);
});
(0, node_test_1.default)('startup with released lease needs reacquire', () => {
    strict_1.default.equal((0, leaseLifecycle_1.needsReacquire)({ state: 'released' }), true);
});
(0, node_test_1.default)('expired lease shows revoked health state', () => {
    const state = (0, leaseLifecycle_1.deriveLeaseHealthState)({
        state: 'expired',
        replacement_required: false,
        rotation_recommended: false,
        expires_at: '2026-03-22T00:00:00.000Z',
    }, new Date('2026-03-22T00:00:00.000Z'));
    strict_1.default.equal(state, 'revoked');
});
(0, node_test_1.default)('released lease shows revoked health state', () => {
    const state = (0, leaseLifecycle_1.deriveLeaseHealthState)({
        state: 'released',
        replacement_required: false,
        rotation_recommended: false,
        expires_at: '2026-03-22T00:00:00.000Z',
    }, new Date('2026-03-22T00:00:00.000Z'));
    strict_1.default.equal(state, 'revoked');
});
(0, node_test_1.default)('replacement required handling prefers rotate', () => {
    strict_1.default.equal((0, leaseLifecycle_1.shouldRotateLease)({
        state: 'active',
        replacement_required: true,
        rotation_recommended: false,
    }, true), true);
});
(0, node_test_1.default)('rotation recommendation alone does not auto-rotate', () => {
    strict_1.default.equal((0, leaseLifecycle_1.shouldRotateLease)({
        state: 'active',
        replacement_required: false,
        rotation_recommended: true,
    }, true), false);
});
(0, node_test_1.default)('rotation recommendation can auto-rotate when policy allows it', () => {
    strict_1.default.equal((0, leaseLifecycle_1.shouldRotateLease)({
        state: 'active',
        replacement_required: false,
        rotation_recommended: true,
    }, true, 'recommended_or_required'), true);
});
(0, node_test_1.default)('renew handling triggers near expiry', () => {
    strict_1.default.equal((0, leaseLifecycle_1.shouldRenewLease)({
        state: 'active',
        replacement_required: false,
        expires_at: '2026-03-22T00:04:00.000Z',
    }, true, new Date('2026-03-22T00:00:00.000Z')), true);
});
(0, node_test_1.default)('replacement required maps to shared startup rotate action', () => {
    strict_1.default.equal((0, leaseLifecycle_1.selectStartupAction)({
        leaseId: 'lease-1',
        leaseStatus: {
            lease_id: 'lease-1',
            credential_id: 'cred-1',
            state: 'active',
            issued_at: '2026-03-22T00:00:00.000Z',
            expires_at: '2026-03-22T02:00:00.000Z',
            renewed_at: null,
            machine_id: 'machine-a',
            agent_id: 'vscode-extension',
            latest_telemetry_at: null,
            latest_utilization_pct: 92,
            latest_quota_remaining: 100,
            last_success_at: null,
            last_error_at: null,
            rotation_recommended: false,
            replacement_required: true,
            reason: null,
            credential_state: 'leased',
        },
        autoRotate: true,
        autoRenew: true,
    }), 'rotate');
});
(0, node_test_1.default)('near-expiry active lease maps to shared startup renew action', () => {
    strict_1.default.equal((0, leaseLifecycle_1.selectStartupAction)({
        leaseId: 'lease-1',
        leaseStatus: {
            lease_id: 'lease-1',
            credential_id: 'cred-1',
            state: 'active',
            issued_at: '2026-03-22T00:00:00.000Z',
            expires_at: '2026-03-22T00:04:00.000Z',
            renewed_at: null,
            machine_id: 'machine-a',
            agent_id: 'vscode-extension',
            latest_telemetry_at: null,
            latest_utilization_pct: 12,
            latest_quota_remaining: 100,
            last_success_at: null,
            last_error_at: null,
            rotation_recommended: false,
            replacement_required: false,
            reason: null,
            credential_state: 'leased',
        },
        autoRotate: true,
        autoRenew: true,
        now: new Date('2026-03-22T00:00:00.000Z'),
    }), 'renew');
});
(0, node_test_1.default)('healthy active lease maps to shared startup noop action', () => {
    strict_1.default.equal((0, leaseLifecycle_1.selectStartupAction)({
        leaseId: 'lease-1',
        leaseStatus: {
            lease_id: 'lease-1',
            credential_id: 'cred-1',
            state: 'active',
            issued_at: '2026-03-22T00:00:00.000Z',
            expires_at: '2026-03-22T01:00:00.000Z',
            renewed_at: null,
            machine_id: 'machine-a',
            agent_id: 'vscode-extension',
            latest_telemetry_at: null,
            latest_utilization_pct: 12,
            latest_quota_remaining: 100,
            last_success_at: null,
            last_error_at: null,
            rotation_recommended: false,
            replacement_required: false,
            reason: null,
            credential_state: 'leased',
        },
        autoRotate: true,
        autoRenew: true,
        now: new Date('2026-03-22T00:00:00.000Z'),
    }), 'noop');
});
(0, node_test_1.default)('404 lease lookup stays on the shared reacquire path', () => {
    strict_1.default.equal((0, leaseLifecycle_1.shouldReacquireAfterLookupError)(404), true);
    strict_1.default.equal((0, leaseLifecycle_1.shouldReacquireAfterLookupError)(500), false);
});
(0, node_test_1.default)('vscode extension matches the shared startup parity matrix', () => {
    for (const scenario of parityMatrix_js_1.startupParityCases) {
        strict_1.default.equal((0, leaseLifecycle_1.selectStartupAction)({
            leaseId: scenario.leaseId,
            leaseStatus: scenario.leaseStatus,
            autoRotate: true,
            autoRenew: true,
            now: new Date('2026-03-23T00:00:00.000Z'),
        }), scenario.expectedAction, scenario.name);
    }
});
(0, node_test_1.default)('vscode extension matches the shared health parity matrix', () => {
    for (const scenario of parityMatrix_js_1.healthParityCases) {
        strict_1.default.equal((0, leaseLifecycle_1.deriveLeaseHealthState)(scenario.leaseStatus, new Date('2026-03-23T00:00:00.000Z')), scenario.expectedHealth, scenario.name);
    }
});
//# sourceMappingURL=leaseLifecycle.test.js.map