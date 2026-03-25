export const DEFAULT_AUTH_FILE_PATH = '~/.codex/auth.json';
export function defaultRuntimeSettings() {
    return {
        baseUrl: 'http://127.0.0.1:8080',
        internalApiToken: '',
        machineId: '',
        agentId: '',
        authFilePath: DEFAULT_AUTH_FILE_PATH,
        refreshIntervalSeconds: 60,
        telemetryIntervalSeconds: 300,
        autoRenew: true,
        autoRotate: true,
        allowInsecureLocalhost: true,
    };
}
export function deriveMachineId(existing, prefix = 'desktop') {
    if (existing.trim()) {
        return existing.trim();
    }
    return `${prefix}-${crypto.randomUUID().slice(0, 12)}`;
}
export function deriveAgentId(existing, fallback = 'desktop-app') {
    return existing.trim() || fallback;
}
export function defaultRuntimeLeaseState(machineId, agentId, authFilePath = DEFAULT_AUTH_FILE_PATH) {
    return {
        machineId,
        agentId,
        leaseId: null,
        credentialId: null,
        accountLabel: null,
        accountName: null,
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
        authFilePath,
    };
}
export function updateRuntimeStateFromLease(state, lease, nowIso = new Date().toISOString()) {
    return {
        ...state,
        leaseId: lease.id,
        credentialId: lease.credential_id,
        accountLabel: typeof lease.metadata?.label === 'string' ? lease.metadata.label : state.accountLabel,
        issuedAt: lease.issued_at,
        expiresAt: lease.expires_at,
        leaseState: lease.state,
        latestTelemetryAt: lease.last_telemetry_at,
        latestUtilizationPct: lease.latest_utilization_pct,
        latestQuotaRemaining: lease.latest_quota_remaining,
        lastBackendRefreshAt: nowIso,
    };
}
export function updateRuntimeStateFromLeaseStatus(state, lease, nowIso = new Date().toISOString()) {
    return {
        ...state,
        leaseId: lease.lease_id,
        credentialId: lease.credential_id,
        issuedAt: lease.issued_at,
        expiresAt: lease.expires_at,
        leaseState: lease.state,
        latestTelemetryAt: lease.latest_telemetry_at,
        latestUtilizationPct: lease.latest_utilization_pct,
        latestQuotaRemaining: lease.latest_quota_remaining,
        replacementRequired: lease.replacement_required,
        rotationRecommended: lease.rotation_recommended,
        lastBackendRefreshAt: nowIso,
    };
}
export function recordAuthWrite(state, atIso) {
    return {
        ...state,
        lastAuthWriteAt: atIso,
    };
}
export function recordError(state, atIso) {
    return {
        ...state,
        lastErrorAt: atIso,
    };
}
//# sourceMappingURL=runtimeState.js.map