"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthManagerClient = exports.normalizeBackendErrorPayload = exports.AuthManagerClientError = void 0;
const authManagerClient_js_1 = require("../../packages/lease-runtime/src/authManagerClient.js");
Object.defineProperty(exports, "AuthManagerClientError", { enumerable: true, get: function () { return authManagerClient_js_1.AuthManagerClientError; } });
Object.defineProperty(exports, "normalizeBackendErrorPayload", { enumerable: true, get: function () { return authManagerClient_js_1.normalizeBackendErrorPayload; } });
class AuthManagerClient extends authManagerClient_js_1.AuthManagerClient {
    async fetchAuthPayloadForLease(leaseId, input) {
        return this.materializeLease(leaseId, input);
    }
}
exports.AuthManagerClient = AuthManagerClient;
//# sourceMappingURL=authManagerClient.js.map