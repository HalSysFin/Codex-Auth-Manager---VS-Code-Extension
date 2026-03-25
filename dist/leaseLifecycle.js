"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.secondsUntilExpiry = secondsUntilExpiry;
exports.deriveLeaseHealthState = deriveLeaseHealthState;
exports.shouldRenewLease = shouldRenewLease;
exports.shouldRotateLease = shouldRotateLease;
exports.needsReacquire = needsReacquire;
function secondsUntilExpiry(expiresAt, now = new Date()) {
    return Math.max(0, Math.floor((new Date(expiresAt).getTime() - now.getTime()) / 1000));
}
function deriveLeaseHealthState(lease, now = new Date()) {
    if (lease.state === 'revoked' || lease.state === 'expired') {
        return 'revoked';
    }
    if (lease.replacement_required) {
        return 'rotation_required';
    }
    if (secondsUntilExpiry(lease.expires_at, now) <= 300) {
        return 'expiring';
    }
    if (lease.rotation_recommended) {
        return 'rotation_required';
    }
    return 'active';
}
function shouldRenewLease(lease, autoRenew, now = new Date()) {
    if (!autoRenew) {
        return false;
    }
    if (lease.state !== 'active') {
        return false;
    }
    if (lease.replacement_required) {
        return false;
    }
    return secondsUntilExpiry(lease.expires_at, now) <= 300;
}
function shouldRotateLease(lease, autoRotate) {
    if (!autoRotate) {
        return false;
    }
    if (lease.state === 'revoked' || lease.state === 'expired') {
        return true;
    }
    return lease.replacement_required || lease.rotation_recommended;
}
function needsReacquire(lease) {
    if (!lease) {
        return true;
    }
    return lease.state === 'revoked' || lease.state === 'expired';
}
//# sourceMappingURL=leaseLifecycle.js.map