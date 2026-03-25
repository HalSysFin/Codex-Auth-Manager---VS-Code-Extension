"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveAccountDisplayName = deriveAccountDisplayName;
exports.formatStatusBarText = formatStatusBarText;
exports.formatStatusBarTooltip = formatStatusBarTooltip;
exports.extractAccountIdentity = extractAccountIdentity;
function suffixForHealth(state) {
    switch (state) {
        case 'expiring':
            return ' (Expiring)';
        case 'rotation_required':
            return ' (Rotate)';
        case 'revoked':
            return ' (Revoked)';
        case 'backend_unavailable':
            return ' (Backend Down)';
        default:
            return '';
    }
}
function deriveAccountDisplayName(state) {
    return state.accountLabel || state.accountName || state.credentialId || 'No Lease';
}
function formatStatusBarText(state, healthState) {
    if (healthState === 'no_lease' || !state.leaseId) {
        return 'Codex: No Lease';
    }
    return `Codex: ${deriveAccountDisplayName(state)}${suffixForHealth(healthState)}`;
}
function formatStatusBarTooltip(state, healthState) {
    if (!state.leaseId) {
        return 'Codex Auth Manager\nNo active lease';
    }
    return [
        `Account: ${deriveAccountDisplayName(state)}`,
        `Lease Id: ${state.leaseId}`,
        `Credential Id: ${state.credentialId || 'Unavailable'}`,
        `Health: ${healthState.replace(/_/g, ' ')}`,
        `Lease State: ${state.leaseState || 'Unavailable'}`,
        `Expires: ${state.expiresAt || 'Unavailable'}`,
        `Utilization: ${state.latestUtilizationPct ?? 'Unavailable'}`,
        `Quota Remaining: ${state.latestQuotaRemaining ?? 'Unavailable'}`,
    ].join('\n');
}
function extractAccountIdentity(materialized) {
    // TODO: Prefer a dedicated backend display_name/account_label field if the broker starts
    // returning one. For now we fall back through the best materialize fields available.
    const label = (typeof materialized.credential_material?.label === 'string' && materialized.credential_material.label.trim()) ||
        (typeof materialized.lease?.metadata?.label === 'string' && materialized.lease.metadata.label.trim()) ||
        null;
    const name = (typeof materialized.credential_material?.name === 'string' && materialized.credential_material.name.trim()) ||
        null;
    return {
        accountLabel: label || null,
        accountName: name || null,
    };
}
//# sourceMappingURL=statusPresentation.js.map