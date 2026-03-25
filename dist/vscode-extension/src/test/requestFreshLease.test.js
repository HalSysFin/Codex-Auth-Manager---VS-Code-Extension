"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const requestFreshLease_1 = require("../requestFreshLease");
(0, node_test_1.default)('manual request-new-lease releases current lease before acquiring a new one', async () => {
    const calls = [];
    await (0, requestFreshLease_1.requestFreshLease)({
        currentLeaseId: 'lease-old',
        releaseCurrentLease: async () => {
            calls.push('release');
        },
        acquireFreshLease: async () => {
            calls.push('acquire');
        },
    });
    strict_1.default.deepEqual(calls, ['release', 'acquire']);
});
(0, node_test_1.default)('manual request-new-lease acquires directly when no lease is active', async () => {
    const calls = [];
    await (0, requestFreshLease_1.requestFreshLease)({
        currentLeaseId: null,
        releaseCurrentLease: async () => {
            calls.push('release');
        },
        acquireFreshLease: async () => {
            calls.push('acquire');
        },
    });
    strict_1.default.deepEqual(calls, ['acquire']);
});
//# sourceMappingURL=requestFreshLease.test.js.map