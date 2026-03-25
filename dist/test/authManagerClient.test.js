"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const authManagerClient_1 = require("../authManagerClient");
(0, node_test_1.default)('normalizeBackendErrorPayload prefers detail', () => {
    strict_1.default.deepEqual((0, authManagerClient_1.normalizeBackendErrorPayload)({ detail: 'Bad token' }), { message: 'Bad token' });
});
(0, node_test_1.default)('normalizeBackendErrorPayload falls back to reason', () => {
    strict_1.default.deepEqual((0, authManagerClient_1.normalizeBackendErrorPayload)({ reason: 'no_eligible_credentials_available' }), {
        message: 'no_eligible_credentials_available',
        code: 'no_eligible_credentials_available',
    });
});
//# sourceMappingURL=authManagerClient.test.js.map