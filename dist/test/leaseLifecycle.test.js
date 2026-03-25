"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const leaseLifecycle_1 = require("../leaseLifecycle");
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
(0, node_test_1.default)('expired lease shows revoked health state', () => {
    const state = (0, leaseLifecycle_1.deriveLeaseHealthState)({
        state: 'expired',
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
(0, node_test_1.default)('renew handling triggers near expiry', () => {
    strict_1.default.equal((0, leaseLifecycle_1.shouldRenewLease)({
        state: 'active',
        replacement_required: false,
        expires_at: '2026-03-22T00:04:00.000Z',
    }, true, new Date('2026-03-22T00:00:00.000Z')), true);
});
//# sourceMappingURL=leaseLifecycle.test.js.map