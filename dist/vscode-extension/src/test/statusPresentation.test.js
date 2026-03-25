"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const statusPresentation_1 = require("../statusPresentation");
(0, node_test_1.default)('status bar text uses account label when known', () => {
    strict_1.default.equal((0, statusPresentation_1.formatStatusBarText)({
        accountLabel: 'max',
        accountName: 'Max',
        credentialId: 'cred-1',
        leaseId: 'lease-1',
    }, 'active'), 'Codex: max');
});
(0, node_test_1.default)('status bar text falls back to credential id when account name is missing', () => {
    strict_1.default.equal((0, statusPresentation_1.formatStatusBarText)({
        accountLabel: null,
        accountName: null,
        credentialId: 'cred-1',
        leaseId: 'lease-1',
    }, 'expiring'), 'Codex: cred-1 (Expiring)');
});
(0, node_test_1.default)('status bar tooltip includes account, lease, credential, and usage details', () => {
    const tooltip = (0, statusPresentation_1.formatStatusBarTooltip)({
        accountLabel: 'max',
        accountName: null,
        leaseId: 'lease-1',
        credentialId: 'cred-1',
        leaseState: 'active',
        expiresAt: '2026-03-23T12:00:00.000Z',
        latestUtilizationPct: 42,
        latestQuotaRemaining: 1234,
    }, 'active');
    strict_1.default.match(tooltip, /Account: max/);
    strict_1.default.match(tooltip, /Lease Id: lease-1/);
    strict_1.default.match(tooltip, /Credential Id: cred-1/);
    strict_1.default.match(tooltip, /Utilization: 42/);
    strict_1.default.match(tooltip, /Quota Remaining: 1234/);
});
(0, node_test_1.default)('extractAccountIdentity prefers materialize label and name fields', () => {
    const identity = (0, statusPresentation_1.extractAccountIdentity)({
        status: 'ok',
        reason: null,
        lease: {
            id: 'lease-1',
            credential_id: 'cred-1',
            machine_id: 'machine-a',
            agent_id: 'vscode-extension',
            state: 'active',
            issued_at: '2026-03-23T10:00:00.000Z',
            expires_at: '2026-03-23T11:00:00.000Z',
            renewed_at: null,
            revoked_at: null,
            released_at: null,
            rotation_reason: null,
            replacement_lease_id: null,
            last_telemetry_at: null,
            latest_utilization_pct: null,
            latest_quota_remaining: null,
            last_success_at: null,
            last_error_at: null,
            reason: null,
            metadata: { label: 'fallback-label' },
            created_at: '2026-03-23T10:00:00.000Z',
            updated_at: '2026-03-23T10:00:00.000Z',
        },
        credential_material: {
            label: 'max',
            name: 'Max',
            auth_json: null,
        },
    });
    strict_1.default.equal(identity.accountLabel, 'max');
    strict_1.default.equal(identity.accountName, 'Max');
});
//# sourceMappingURL=statusPresentation.test.js.map