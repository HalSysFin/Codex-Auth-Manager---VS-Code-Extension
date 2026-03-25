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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const fs = __importStar(require("node:fs/promises"));
const path = __importStar(require("node:path"));
const authFile_1 = require("../authFile");
const authFile_2 = require("../authFile");
const authPayload_js_1 = require("../../../packages/lease-runtime/src/authPayload.js");
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
(0, node_test_1.default)('prepareAuthPayloadForWrite populates last_refresh through shared helper', () => {
    const prepared = (0, authPayload_js_1.prepareAuthPayloadForWrite)({
        auth_mode: 'chatgpt',
        OPENAI_API_KEY: null,
        tokens: {
            id_token: 'id',
            access_token: 'access',
            refresh_token: 'refresh',
            account_id: 'acct',
        },
    }, '2026-03-22T00:00:00.000Z');
    strict_1.default.equal(prepared.last_refresh, '2026-03-22T00:00:00.000Z');
});
(0, node_test_1.default)('writeAuthFile creates parent directories and rewrites auth contents', async () => {
    const tempRoot = await fs.mkdtemp(path.join(process.cwd(), 'tmp-vscode-auth-file-'));
    const authPath = path.join(tempRoot, 'nested', 'auth.json');
    try {
        const first = await (0, authFile_2.writeAuthFile)(authPath, {
            auth_mode: 'chatgpt',
            OPENAI_API_KEY: null,
            tokens: {
                id_token: 'id-1',
                access_token: 'access-1',
                refresh_token: 'refresh-1',
                account_id: 'acct-1',
            },
        });
        const second = await (0, authFile_2.writeAuthFile)(authPath, {
            auth_mode: 'chatgpt',
            OPENAI_API_KEY: null,
            tokens: {
                id_token: 'id-2',
                access_token: 'access-2',
                refresh_token: 'refresh-2',
                account_id: 'acct-2',
            },
        });
        const content = JSON.parse(await fs.readFile(authPath, 'utf8'));
        strict_1.default.equal(first.path, authPath);
        strict_1.default.equal(second.path, authPath);
        strict_1.default.equal(content.tokens.account_id, 'acct-2');
    }
    finally {
        await fs.rm(tempRoot, { recursive: true, force: true });
    }
});
(0, node_test_1.default)('deleteAuthFile removes auth.json and is idempotent', async () => {
    const tempRoot = await fs.mkdtemp(path.join(process.cwd(), 'tmp-vscode-auth-delete-'));
    const authPath = path.join(tempRoot, 'nested', 'auth.json');
    try {
        await (0, authFile_2.writeAuthFile)(authPath, {
            auth_mode: 'chatgpt',
            OPENAI_API_KEY: null,
            tokens: {
                id_token: 'id-1',
                access_token: 'access-1',
                refresh_token: 'refresh-1',
                account_id: 'acct-1',
            },
        });
        strict_1.default.equal(await (0, authFile_2.deleteAuthFile)(authPath), true);
        strict_1.default.equal(await (0, authFile_2.deleteAuthFile)(authPath), false);
    }
    finally {
        await fs.rm(tempRoot, { recursive: true, force: true });
    }
});
//# sourceMappingURL=authFile.test.js.map