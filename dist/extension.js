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
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const authManagerClient_1 = require("./authManagerClient");
const authFile_1 = require("./authFile");
const leaseLifecycle_1 = require("./leaseLifecycle");
const leaseStateStore_1 = require("./leaseStateStore");
const telemetry_1 = require("./telemetry");
const leaseWebview_1 = require("./views/leaseWebview");
class AuthManagerController {
    context;
    output = vscode.window.createOutputChannel('Codex Auth Manager');
    statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    stateStore;
    webviewProvider;
    refreshTimer;
    telemetryTimer;
    state;
    client;
    backendReachable = false;
    lastMessage = null;
    runningEnsure = false;
    constructor(context) {
        this.context = context;
        this.stateStore = new leaseStateStore_1.LeaseStateStore(context.globalState);
        this.webviewProvider = new leaseWebview_1.LeaseWebviewProvider(context.extensionUri, {
            onRefresh: () => void this.refreshLease('refresh'),
            onRenew: () => void this.renewLease(),
            onRotate: () => void this.rotateLease(),
            onRelease: () => void this.releaseLease(),
            onReloadAuth: () => void this.reloadCodexAuth(),
            onReloadWindow: () => void this.reloadWindow(),
            onOpenDashboard: () => void this.openDashboard(),
            onVisible: () => void this.refreshLease('refresh'),
        });
        this.statusBar.command = 'authManager.showLeaseView';
        this.statusBar.show();
    }
    async activate() {
        const configuration = vscode.workspace.getConfiguration();
        const machineId = await this.stateStore.getOrCreateMachineId(configuration.get('authManager.machineId'));
        const agentId = await this.stateStore.getOrCreateAgentId(configuration.get('authManager.agentId'));
        this.state = this.stateStore.load(machineId, agentId);
        this.rebuildClient();
        this.registerCommands();
        this.context.subscriptions.push(this.output, this.statusBar, vscode.window.registerWebviewViewProvider(leaseWebview_1.LeaseWebviewProvider.viewType, this.webviewProvider), vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('authManager')) {
                this.rebuildClient();
                void this.ensureLease();
                this.restartTimers();
            }
        }));
        this.updatePresentation();
        await this.ensureLease();
        this.restartTimers();
    }
    registerCommands() {
        this.context.subscriptions.push(vscode.commands.registerCommand('authManager.ensureLease', async () => this.ensureLease()), vscode.commands.registerCommand('authManager.refreshLease', async () => this.refreshLease('refresh')), vscode.commands.registerCommand('authManager.rotateLease', async () => this.rotateLease()), vscode.commands.registerCommand('authManager.releaseLease', async () => this.releaseLease()), vscode.commands.registerCommand('authManager.reloadCodexAuth', async () => this.reloadCodexAuth()), vscode.commands.registerCommand('authManager.reloadWindow', async () => this.reloadWindow()), vscode.commands.registerCommand('authManager.openDashboard', async () => this.openDashboard()), vscode.commands.registerCommand('authManager.showLeaseView', async () => this.showLeaseView()));
    }
    rebuildClient() {
        const config = vscode.workspace.getConfiguration();
        this.client = new authManagerClient_1.AuthManagerClient({
            baseUrl: config.get('authManager.baseUrl', 'http://127.0.0.1:8080'),
            internalApiToken: config.get('authManager.internalApiToken', ''),
            allowInsecureLocalhost: config.get('authManager.allowInsecureLocalhost', true),
        });
    }
    restartTimers() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        if (this.telemetryTimer) {
            clearInterval(this.telemetryTimer);
        }
        const refreshMs = Math.max(15, vscode.workspace.getConfiguration().get('authManager.refreshIntervalSeconds', 60)) * 1000;
        const telemetryMs = Math.max(60, vscode.workspace.getConfiguration().get('authManager.telemetryIntervalSeconds', 300)) * 1000;
        this.refreshTimer = setInterval(() => void this.refreshLease('refresh'), refreshMs);
        this.telemetryTimer = setInterval(() => void this.postTelemetry(), telemetryMs);
    }
    log(message) {
        this.output.appendLine(`[${new Date().toISOString()}] ${message}`);
    }
    setMessage(message) {
        this.lastMessage = message;
        this.updatePresentation();
    }
    updatePresentation() {
        const healthState = this.currentHealthState();
        this.statusBar.text = `Auth Lease: ${this.statusBarLabel(healthState)}`;
        this.statusBar.tooltip = this.state.leaseId
            ? `Lease ${this.state.leaseId} (${this.state.leaseState || 'unknown'})`
            : 'No active Auth Manager lease';
        this.webviewProvider.update(this.currentViewModel());
    }
    currentHealthState() {
        if (!this.backendReachable && this.state.lastErrorAt) {
            return 'backend_unavailable';
        }
        if (!this.state.leaseId || !this.state.leaseState) {
            return 'no_lease';
        }
        if (!this.state.expiresAt) {
            return 'no_lease';
        }
        return (0, leaseLifecycle_1.deriveLeaseHealthState)({
            state: this.state.leaseState,
            replacement_required: this.state.replacementRequired,
            rotation_recommended: this.state.rotationRecommended,
            expires_at: this.state.expiresAt,
        });
    }
    statusBarLabel(state) {
        switch (state) {
            case 'active':
                return 'Active';
            case 'expiring':
                return 'Expiring';
            case 'rotation_required':
                return 'Rotate';
            case 'revoked':
                return 'Revoked';
            case 'backend_unavailable':
                return 'Backend Down';
            default:
                return 'No Lease';
        }
    }
    currentViewModel() {
        const config = vscode.workspace.getConfiguration();
        return {
            state: this.state,
            healthState: this.currentHealthState(),
            baseUrl: config.get('authManager.baseUrl', 'http://127.0.0.1:8080'),
            authFilePath: config.get('authManager.authFilePath', '~/.codex/auth.json'),
            backendReachable: this.backendReachable,
            lastMessage: this.lastMessage,
        };
    }
    async ensureLease() {
        if (this.runningEnsure) {
            return;
        }
        this.runningEnsure = true;
        try {
            this.log('Starting ensureLease flow');
            if (!this.state.leaseId) {
                await this.acquireAndMaterializeLease('startup ensure');
                return;
            }
            let status;
            try {
                status = await this.client.getLease(this.state.leaseId);
                this.backendReachable = true;
            }
            catch (error) {
                if (this.shouldReacquireAfterLookupError(error)) {
                    this.log(`Stored lease ${this.state.leaseId} is gone; reacquiring`);
                    this.state = await this.stateStore.clear(this.state.machineId, this.state.agentId);
                    await this.acquireAndMaterializeLease('startup reacquire missing lease');
                    return;
                }
                this.backendReachable = false;
                await this.handleBackendError(error, 'Failed to refresh current lease on startup');
                return;
            }
            this.state = await this.stateStore.updateFromLeaseStatus(this.state, status);
            if ((0, leaseLifecycle_1.needsReacquire)(status)) {
                this.log(`Lease ${status.lease_id} is no longer usable; acquiring replacement`);
                await this.acquireAndMaterializeLease('startup reacquire');
                return;
            }
            if ((0, leaseLifecycle_1.shouldRotateLease)(status, vscode.workspace.getConfiguration().get('authManager.autoRotate', true))) {
                await this.rotateLease();
                return;
            }
            if ((0, leaseLifecycle_1.shouldRenewLease)(status, vscode.workspace.getConfiguration().get('authManager.autoRenew', true))) {
                await this.renewLease();
            }
            if (!(await (0, authFile_1.authFileExists)(this.authFilePath()))) {
                this.log('Auth file missing; materializing active lease');
                await this.materializeAndWriteAuth(status.lease_id);
            }
            this.setMessage('Lease is healthy.');
        }
        finally {
            this.runningEnsure = false;
            this.updatePresentation();
        }
    }
    async refreshLease(origin) {
        if (!this.state.leaseId) {
            await this.ensureLease();
            return;
        }
        this.log(`Refreshing lease state (${origin})`);
        try {
            const status = await this.client.getLease(this.state.leaseId);
            this.backendReachable = true;
            this.state = await this.stateStore.updateFromLeaseStatus(this.state, status);
            if ((0, leaseLifecycle_1.needsReacquire)(status)) {
                this.log(`Lease ${status.lease_id} is no longer usable during refresh; reacquiring`);
                this.state = await this.stateStore.clear(this.state.machineId, this.state.agentId);
                await this.acquireAndMaterializeLease('refresh reacquire');
                return;
            }
            if ((0, leaseLifecycle_1.shouldRotateLease)(status, vscode.workspace.getConfiguration().get('authManager.autoRotate', true))) {
                await this.rotateLease();
                return;
            }
            if ((0, leaseLifecycle_1.shouldRenewLease)(status, vscode.workspace.getConfiguration().get('authManager.autoRenew', true))) {
                await this.renewLease();
            }
            this.setMessage(`Lease refreshed at ${new Date().toLocaleTimeString()}.`);
        }
        catch (error) {
            if (this.shouldReacquireAfterLookupError(error)) {
                this.log(`Stored lease ${this.state.leaseId} was not found during refresh; reacquiring`);
                this.state = await this.stateStore.clear(this.state.machineId, this.state.agentId);
                await this.acquireAndMaterializeLease('refresh reacquire missing lease');
                return;
            }
            this.backendReachable = false;
            await this.handleBackendError(error, 'Unable to refresh lease state');
        }
        finally {
            this.updatePresentation();
        }
    }
    async renewLease() {
        if (!this.state.leaseId) {
            await this.ensureLease();
            return;
        }
        this.log(`Renewing lease ${this.state.leaseId}`);
        try {
            const response = await this.client.renewLease(this.state.leaseId, {
                machineId: this.state.machineId,
                agentId: this.state.agentId,
            });
            this.backendReachable = true;
            if (response.status !== 'ok' || !response.lease) {
                throw new Error(response.reason || 'Lease renew denied');
            }
            this.state = await this.stateStore.updateFromLease(this.state, response.lease);
            this.setMessage('Lease renewed.');
        }
        catch (error) {
            await this.handleBackendError(error, 'Unable to renew lease');
        }
        finally {
            this.updatePresentation();
        }
    }
    async rotateLease() {
        if (!this.state.leaseId) {
            await this.acquireAndMaterializeLease('rotate with no lease');
            return;
        }
        this.log(`Rotating lease ${this.state.leaseId}`);
        try {
            const response = await this.client.rotateLease({
                leaseId: this.state.leaseId,
                machineId: this.state.machineId,
                agentId: this.state.agentId,
                reason: 'approaching_utilization_threshold',
            });
            this.backendReachable = true;
            if (response.status !== 'ok' || !response.lease) {
                throw new Error(response.reason || 'Lease rotation denied');
            }
            this.state = await this.stateStore.updateFromLease(this.state, response.lease);
            await this.materializeAndWriteAuth(response.lease.id);
            this.setMessage('Lease rotated and auth file updated.');
        }
        catch (error) {
            await this.handleBackendError(error, 'Unable to rotate lease');
        }
        finally {
            this.updatePresentation();
        }
    }
    async releaseLease() {
        if (!this.state.leaseId) {
            this.setMessage('No active lease to release.');
            return;
        }
        this.log(`Releasing lease ${this.state.leaseId}`);
        try {
            const response = await this.client.releaseLease(this.state.leaseId, {
                machineId: this.state.machineId,
                agentId: this.state.agentId,
                reason: 'Released from VS Code extension',
            });
            this.backendReachable = true;
            if (response.status !== 'ok') {
                throw new Error(response.reason || 'Lease release denied');
            }
            this.state = await this.stateStore.clear(this.state.machineId, this.state.agentId);
            this.setMessage('Lease released.');
        }
        catch (error) {
            await this.handleBackendError(error, 'Unable to release lease');
        }
        finally {
            this.updatePresentation();
        }
    }
    async reloadCodexAuth() {
        if (!this.state.leaseId) {
            await this.ensureLease();
            return;
        }
        this.log(`Reloading Codex auth from lease ${this.state.leaseId}`);
        try {
            await this.materializeAndWriteAuth(this.state.leaseId);
            const selection = await vscode.window.showInformationMessage('Codex auth file updated. Reload the VS Code window if you want dependent tooling to reconnect immediately.', 'Reload Window', 'Later');
            if (selection === 'Reload Window') {
                await vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
        }
        catch (error) {
            await this.handleBackendError(error, 'Unable to reload Codex auth');
        }
        finally {
            this.updatePresentation();
        }
    }
    async reloadWindow() {
        await vscode.commands.executeCommand('workbench.action.reloadWindow');
    }
    async openDashboard() {
        const config = vscode.workspace.getConfiguration();
        const baseUrl = config.get('authManager.baseUrl', 'http://127.0.0.1:8080').replace(/\/+$/, '');
        const dashboardPath = config.get('authManager.openDashboardPath', '').trim();
        const target = dashboardPath ? new URL(dashboardPath, `${baseUrl}/`).toString() : baseUrl;
        await vscode.env.openExternal(vscode.Uri.parse(target));
    }
    async acquireAndMaterializeLease(reason) {
        this.log(`Acquiring lease (${reason})`);
        try {
            const response = await this.client.acquireLease({
                machineId: this.state.machineId,
                agentId: this.state.agentId,
                requestedTtlSeconds: 1800,
                reason,
            });
            this.backendReachable = true;
            if (response.status !== 'ok' || !response.lease) {
                throw new Error(response.reason || 'No eligible credentials available');
            }
            this.state = await this.stateStore.updateFromLease(this.state, response.lease);
            await this.materializeAndWriteAuth(response.lease.id);
            this.setMessage('Lease acquired and auth file written.');
        }
        catch (error) {
            await this.handleBackendError(error, 'Unable to acquire lease');
        }
        finally {
            this.updatePresentation();
        }
    }
    async materializeAndWriteAuth(leaseId) {
        const materialized = await this.client.fetchAuthPayloadForLease(leaseId, {
            machineId: this.state.machineId,
            agentId: this.state.agentId,
        });
        if (materialized.status !== 'ok' || !materialized.credential_material?.auth_json) {
            throw new Error(materialized.reason || 'Backend did not return auth payload for this lease');
        }
        const payload = materialized.credential_material.auth_json;
        await this.writePayloadToAuthFile(payload);
        if (materialized.lease) {
            this.state = await this.stateStore.updateFromLease(this.state, materialized.lease);
        }
    }
    async writePayloadToAuthFile(payload) {
        const result = await (0, authFile_1.writeAuthFile)(this.authFilePath(), payload);
        this.state = await this.stateStore.recordAuthWrite(this.state, result.writtenAt);
        this.log(`Wrote auth file to ${result.path}`);
    }
    async postTelemetry() {
        if (!this.state.leaseId) {
            return;
        }
        try {
            await this.client.postTelemetry(this.state.leaseId, (0, telemetry_1.buildLeaseTelemetryPayload)(this.state));
            this.backendReachable = true;
            this.log(`Posted telemetry for lease ${this.state.leaseId}`);
        }
        catch (error) {
            await this.handleBackendError(error, 'Unable to post telemetry', false);
        }
        finally {
            this.updatePresentation();
        }
    }
    authFilePath() {
        return vscode.workspace.getConfiguration().get('authManager.authFilePath', '~/.codex/auth.json');
    }
    async showLeaseView() {
        await vscode.commands.executeCommand('workbench.view.extension.authManager');
        await vscode.commands.executeCommand('authManager.leaseView.focus');
    }
    shouldReacquireAfterLookupError(error) {
        return error instanceof authManagerClient_1.AuthManagerClientError && error.status === 404;
    }
    async handleBackendError(error, userMessage, showPopup = true) {
        const message = error instanceof Error ? error.message : String(error);
        this.log(`${userMessage}: ${message}`);
        this.state = await this.stateStore.recordError(this.state, new Date().toISOString());
        this.setMessage(message);
        if (showPopup) {
            void vscode.window.showWarningMessage(`${userMessage}: ${message}`);
        }
    }
}
async function activate(context) {
    const controller = new AuthManagerController(context);
    await controller.activate();
}
function deactivate() { }
//# sourceMappingURL=extension.js.map