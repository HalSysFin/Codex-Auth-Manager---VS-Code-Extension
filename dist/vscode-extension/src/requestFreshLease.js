"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestFreshLease = requestFreshLease;
async function requestFreshLease(deps) {
    if (deps.currentLeaseId) {
        await deps.releaseCurrentLease();
    }
    await deps.acquireFreshLease();
}
//# sourceMappingURL=requestFreshLease.js.map