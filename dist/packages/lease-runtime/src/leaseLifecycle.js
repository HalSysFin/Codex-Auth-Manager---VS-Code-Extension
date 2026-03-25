export function secondsUntilExpiry(expiresAt, now = new Date()) {
    return Math.max(0, Math.floor((new Date(expiresAt).getTime() - now.getTime()) / 1000));
}
export function deriveLeaseHealthState(lease, now = new Date()) {
    if (lease.state === 'revoked' || lease.state === 'expired' || lease.state === 'released') {
        return 'revoked';
    }
    if (lease.replacement_required || lease.rotation_recommended) {
        return 'rotation_required';
    }
    if (secondsUntilExpiry(lease.expires_at, now) <= 300) {
        return 'expiring';
    }
    return 'active';
}
export function shouldRenewLease(lease, autoRenew, now = new Date()) {
    if (!autoRenew || lease.state !== 'active' || lease.replacement_required) {
        return false;
    }
    return secondsUntilExpiry(lease.expires_at, now) <= 300;
}
export function shouldRotateLease(lease, autoRotate, rotationPolicy = 'replacement_required_only') {
    if (!autoRotate) {
        return false;
    }
    if (lease.state === 'revoked' || lease.state === 'expired') {
        return true;
    }
    if (rotationPolicy === 'recommended_or_required') {
        return lease.replacement_required || lease.rotation_recommended;
    }
    // Default policy keeps a leased auth pinned until replacement is actually required.
    return lease.replacement_required;
}
export function needsReacquire(lease) {
    if (!lease) {
        return true;
    }
    return lease.state === 'revoked' || lease.state === 'expired' || lease.state === 'released';
}
export function selectStartupAction(input) {
    if (!input.leaseId) {
        return 'acquire';
    }
    if (!input.leaseStatus) {
        return 'reacquire';
    }
    if (needsReacquire(input.leaseStatus)) {
        return 'reacquire';
    }
    if (shouldRotateLease(input.leaseStatus, input.autoRotate, input.rotationPolicy)) {
        return 'rotate';
    }
    if (shouldRenewLease(input.leaseStatus, input.autoRenew, input.now)) {
        return 'renew';
    }
    return 'noop';
}
export function shouldReacquireAfterLookupError(statusCode) {
    return statusCode === 404;
}
//# sourceMappingURL=leaseLifecycle.js.map