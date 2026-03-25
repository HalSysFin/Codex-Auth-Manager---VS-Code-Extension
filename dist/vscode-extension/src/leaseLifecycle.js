"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldRotateLease = exports.shouldRenewLease = exports.shouldReacquireAfterLookupError = exports.selectStartupAction = exports.secondsUntilExpiry = exports.needsReacquire = exports.deriveLeaseHealthState = void 0;
var leaseLifecycle_js_1 = require("../../packages/lease-runtime/src/leaseLifecycle.js");
Object.defineProperty(exports, "deriveLeaseHealthState", { enumerable: true, get: function () { return leaseLifecycle_js_1.deriveLeaseHealthState; } });
Object.defineProperty(exports, "needsReacquire", { enumerable: true, get: function () { return leaseLifecycle_js_1.needsReacquire; } });
Object.defineProperty(exports, "secondsUntilExpiry", { enumerable: true, get: function () { return leaseLifecycle_js_1.secondsUntilExpiry; } });
Object.defineProperty(exports, "selectStartupAction", { enumerable: true, get: function () { return leaseLifecycle_js_1.selectStartupAction; } });
Object.defineProperty(exports, "shouldReacquireAfterLookupError", { enumerable: true, get: function () { return leaseLifecycle_js_1.shouldReacquireAfterLookupError; } });
Object.defineProperty(exports, "shouldRenewLease", { enumerable: true, get: function () { return leaseLifecycle_js_1.shouldRenewLease; } });
Object.defineProperty(exports, "shouldRotateLease", { enumerable: true, get: function () { return leaseLifecycle_js_1.shouldRotateLease; } });
//# sourceMappingURL=leaseLifecycle.js.map