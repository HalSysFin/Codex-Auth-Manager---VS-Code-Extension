"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const authFile_1 = require("../authFile");
(0, node_test_1.default)('expandHomePath expands leading tilde', () => {
    const expanded = (0, authFile_1.expandHomePath)('~/.codex/auth.json');
    strict_1.default.ok(expanded.endsWith('.codex/auth.json'));
    strict_1.default.ok(!expanded.startsWith('~/'));
});
(0, node_test_1.default)('validateAuthPayload accepts correct shape', () => {
    strict_1.default.equal((0, authFile_1.validateAuthPayload)({
        auth_mode: 'chatgpt',
        OPENAI_API_KEY: null,
        tokens: {
            id_token: 'id',
            access_token: 'access',
            refresh_token: 'refresh',
            account_id: 'acct',
        },
        last_refresh: '2026-03-22T00:00:00.000Z',
    }), true);
});
(0, node_test_1.default)('validateAuthPayload rejects incomplete shape', () => {
    strict_1.default.equal((0, authFile_1.validateAuthPayload)({
        auth_mode: 'chatgpt',
        OPENAI_API_KEY: null,
        tokens: {
            access_token: 'access',
        },
    }), false);
});
//# sourceMappingURL=authFile.test.js.map