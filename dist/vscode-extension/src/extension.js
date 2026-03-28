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
const os = __importStar(require("node:os"));
const authManagerClient_1 = require("./authManagerClient");
const authFile_1 = require("./authFile");
const leaseLifecycle_1 = require("./leaseLifecycle");
const requestFreshLease_1 = require("./requestFreshLease");
const leaseStateStore_1 = require("./leaseStateStore");
const statusPresentation_1 = require("./statusPresentation");
const telemetry_1 = require("./telemetry");
const leaseWebview_1 = require("./views/leaseWebview");
const RELEASE_REPO = 'HalSysFin/Codex-Auth-Manager---VS-Code-Extension';
const RELEASE_CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000;
const RELEASE_CHECK_CACHE_KEY = 'authManager.releaseCheck';
const RELEASE_CHECK_USER_AGENT = 'codex-auth-manager-extension';
function compareVersions(left, right) {
    const normalize = (value) => value
        .trim()
        .replace(/^v/i, '')
        .split('.')
        .map((part) => Number.parseInt(part.replace(/[^0-9].*$/, ''), 10) || 0);
    const a = normalize(left);
    const b = normalize(right);
    const length = Math.max(a.length, b.length);
    for (let index = 0; index < length; index += 1) {
        const diff = (a[index] || 0) - (b[index] || 0);
        if (diff !== 0) {
            return diff > 0 ? 1 : -1;
        }
    }
    return 0;
}
class AuthManagerController {
    context;
    output = vscode.window.createOutputChannel('Codex Auth Manager');
    statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
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
            onRequestNewLease: () => void this.requestNewLease(),
            onRelease: () => void this.releaseLease(),
            onReloadAuth: () => void this.reloadCodexAuth(),
            onReloadWindow: () => void this.reloadWindow(),
            onOpenDashboard: () => void this.openDashboard(),
            onVisible: () => void this.refreshLease('refresh'),
        });
        this.statusBar.command = 'authManager.showLeaseView';
        this.statusBar.show();
    }
    machineHostContext() {
        const authority = vscode.workspace.workspaceFolders?.[0]?.uri.authority?.trim();
        if (authority) {
            return authority;
        }
        const workspaceAuthority = vscode.workspace.workspaceFile?.authority?.trim();
        if (workspaceAuthority) {
            return workspaceAuthority;
        }
        const remoteName = vscode.env.remoteName?.trim();
        const hostname = os.hostname().trim();
        if (remoteName) {
            if (hostname) {
                return `${remoteName}+${hostname}`;
            }
            return remoteName;
        }
        return undefined;
    }
    async activate() {
        const configuration = vscode.workspace.getConfiguration();
        const machineId = await this.stateStore.getOrCreateMachineId(configuration.get('authManager.machineId'), vscode.env.machineId, this.machineHostContext());
        const agentId = await this.stateStore.getOrCreateAgentId(configuration.get('authManager.agentId'));
        this.state = this.stateStore.load(machineId, agentId, this.authFilePath());
        this.rebuildClient();
        this.registerCommands();
        this.context.subscriptions.push(this.output, this.statusBar, vscode.window.registerWebviewViewProvider(leaseWebview_1.LeaseWebviewProvider.viewType, this.webviewProvider), vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('authManager')) {
                this.state = { ...this.state, authFilePath: this.authFilePath() };
                this.rebuildClient();
                void this.ensureLease();
                this.restartTimers();
            }
        }));
        this.updatePresentation();
        void this.checkForExtensionUpdate();
        await this.ensureLease();
        this.restartTimers();
    }
    async checkForExtensionUpdate() {
        const cacheKey = `${RELEASE_CHECK_CACHE_KEY}:${RELEASE_REPO}`;
        const now = Date.now();
        const lastCheckedAt = this.context.globalState.get(cacheKey, 0);
        if (now - lastCheckedAt < RELEASE_CHECK_INTERVAL_MS) {
            return;
        }
        await this.context.globalState.update(cacheKey, now);
        try {
            const response = await fetch(`https://api.github.com/repos/${RELEASE_REPO}/releases/latest`, {
                headers: {
                    Accept: 'application/vnd.github+json',
                    'User-Agent': RELEASE_CHECK_USER_AGENT,
                },
            });
            if (!response.ok) {
                throw new Error(`GitHub release check failed with ${response.status}`);
            }
            const release = (await response.json());
            const latestVersion = release.tag_name?.trim();
            const currentVersion = String(this.context.extension.packageJSON.version || '').trim();
            if (!latestVersion || !currentVersion || compareVersions(latestVersion, currentVersion) <= 0) {
                return;
            }
            this.log(`Extension update available: current=${currentVersion} latest=${latestVersion}`);
            const selection = await vscode.window.showInformationMessage(`A newer release of ${this.context.extension.packageJSON.displayName || this.context.extension.packageJSON.name} is available (${latestVersion}).`, 'View Release', 'Dismiss');
            if (selection === 'View Release') {
                const releaseUrl = release.html_url || `https://github.com/${RELEASE_REPO}/releases/latest`;
                await vscode.env.openExternal(vscode.Uri.parse(releaseUrl));
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.log(`Extension version check skipped: ${message}`);
        }
    }
    registerCommands() {
        this.context.subscriptions.push(vscode.commands.registerCommand('authManager.ensureLease', async () => this.ensureLease()), vscode.commands.registerCommand('authManager.refreshLease', async () => this.refreshLease('refresh')), vscode.commands.registerCommand('authManager.requestNewLease', async () => this.requestNewLease()), vscode.commands.registerCommand('authManager.rotateLease', async () => this.rotateLease()), vscode.commands.registerCommand('authManager.releaseLease', async () => this.releaseLease()), vscode.commands.registerCommand('authManager.reloadCodexAuth', async () => this.reloadCodexAuth()), vscode.commands.registerCommand('authManager.reloadWindow', async () => this.reloadWindow()), vscode.commands.registerCommand('authManager.openDashboard', async () => this.openDashboard()), vscode.commands.registerCommand('authManager.showLeaseView', async () => this.showLeaseView()));
    }
    rebuildClient() {
        const config = vscode.workspace.getConfiguration();
        this.client = new authManagerClient_1.AuthManagerClient({
            baseUrl: config.get('authManager.baseUrl', 'http://127.0.0.1:8080'),
            internalApiToken: config.get('authManager.internalApiToken', ''),
            allowInsecureLocalhost: config.get('authManager.allowInsecureLocalhost', true),
        });
    }
    autoReloadWindowOnLeaseChange() {
        return vscode.workspace
            .getConfiguration()
            .get('authManager.autoReloadWindowOnLeaseChange', false);
    }
    releaseLeaseOnShutdown() {
        return vscode.workspace
            .getConfiguration()
            .get('authManager.releaseLeaseOnShutdown', true);
    }
    deleteAuthFileOnShutdown() {
        return vscode.workspace
            .getConfiguration()
            .get('authManager.deleteAuthFileOnShutdown', true);
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
        this.statusBar.text = (0, statusPresentation_1.formatStatusBarText)(this.state, healthState);
        this.statusBar.tooltip = (0, statusPresentation_1.formatStatusBarTooltip)(this.state, healthState);
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
    shouldRematerializeAuth(status) {
        if (!this.state.leaseId || !status.auth_refresh_required) {
            return false;
        }
        if (!status.credential_auth_updated_at) {
            return true;
        }
        if (!this.state.lastAuthWriteAt) {
            return true;
        }
        return status.credential_auth_updated_at > this.state.lastAuthWriteAt;
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
                await this.acquireAndMaterializeLease('startup ensure', false);
                return;
            }
            let status;
            try {
                status = await this.client.getLease(this.state.leaseId);
                this.backendReachable = true;
            }
            catch (error) {
                if ((0, leaseLifecycle_1.shouldReacquireAfterLookupError)(error instanceof authManagerClient_1.AuthManagerClientError ? error.status : null)) {
                    this.log(`Stored lease ${this.state.leaseId} is gone; reacquiring`);
                    this.state = await this.stateStore.clear(this.state.machineId, this.state.agentId, this.authFilePath());
                    await this.acquireAndMaterializeLease('startup reacquire missing lease', false);
                    return;
                }
                this.backendReachable = false;
                await this.handleBackendError(error, 'Failed to refresh current lease on startup', false);
                return;
            }
            this.state = await this.stateStore.updateFromLeaseStatus(this.state, status);
            const startupAction = (0, leaseLifecycle_1.selectStartupAction)({
                leaseId: this.state.leaseId,
                leaseStatus: status,
                autoRotate: vscode.workspace.getConfiguration().get('authManager.autoRotate', true),
                rotationPolicy: status.effective_rotation_policy ?? 'replacement_required_only',
                autoRenew: vscode.workspace.getConfiguration().get('authManager.autoRenew', true),
            });
            if (startupAction === 'reacquire') {
                this.log(`Lease ${status.lease_id} is no longer usable; acquiring replacement`);
                await this.acquireAndMaterializeLease('startup reacquire', false);
                return;
            }
            if (startupAction === 'rotate') {
                await this.rotateLease(false);
                return;
            }
            if (startupAction === 'renew') {
                await this.renewLease(false);
            }
            if (this.shouldRematerializeAuth(status)) {
                this.log('Credential auth changed on the manager; rematerializing active lease');
                await this.materializeAndWriteAuth(status.lease_id);
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
            const refreshAction = (0, leaseLifecycle_1.selectStartupAction)({
                leaseId: this.state.leaseId,
                leaseStatus: status,
                autoRotate: vscode.workspace.getConfiguration().get('authManager.autoRotate', true),
                rotationPolicy: status.effective_rotation_policy ?? 'replacement_required_only',
                autoRenew: vscode.workspace.getConfiguration().get('authManager.autoRenew', true),
            });
            if (refreshAction === 'reacquire') {
                this.log(`Lease ${status.lease_id} is no longer usable during refresh; reacquiring`);
                this.state = await this.stateStore.clear(this.state.machineId, this.state.agentId, this.authFilePath());
                await this.acquireAndMaterializeLease('refresh reacquire', false);
                return;
            }
            if (refreshAction === 'rotate') {
                await this.rotateLease(false);
                return;
            }
            if (refreshAction === 'renew') {
                await this.renewLease(false);
            }
            if (this.shouldRematerializeAuth(status)) {
                this.log(`Credential auth changed for lease ${status.lease_id}; rematerializing`);
                await this.materializeAndWriteAuth(status.lease_id);
            }
            this.setMessage(`Lease refreshed at ${new Date().toLocaleTimeString()}.`);
        }
        catch (error) {
            if ((0, leaseLifecycle_1.shouldReacquireAfterLookupError)(error instanceof authManagerClient_1.AuthManagerClientError ? error.status : null)) {
                this.log(`Stored lease ${this.state.leaseId} was not found during refresh; reacquiring`);
                this.state = await this.stateStore.clear(this.state.machineId, this.state.agentId, this.authFilePath());
                await this.acquireAndMaterializeLease('refresh reacquire missing lease', false);
                return;
            }
            this.backendReachable = false;
            await this.handleBackendError(error, 'Unable to refresh lease state', false);
            this.setMessage('Backend unavailable; keeping current lease and retrying in background.');
        }
        finally {
            this.updatePresentation();
        }
    }
    async renewLease(showPopup = true) {
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
            await this.handleBackendError(error, 'Unable to renew lease', showPopup);
            if (!showPopup) {
                this.setMessage('Backend unavailable during renew; keeping current lease.');
            }
        }
        finally {
            this.updatePresentation();
        }
    }
    async rotateLease(showPopup = true) {
        if (!this.state.leaseId) {
            await this.acquireAndMaterializeLease('rotate with no lease');
            return;
        }
        this.log(`Rotating lease ${this.state.leaseId}`);
        const previousLeaseId = this.state.leaseId;
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
            if (this.autoReloadWindowOnLeaseChange()
                && previousLeaseId
                && response.lease.id
                && response.lease.id !== previousLeaseId) {
                this.log(`Lease changed (${previousLeaseId} -> ${response.lease.id}); reloading window`);
                await vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
        }
        catch (error) {
            await this.handleBackendError(error, 'Unable to rotate lease', showPopup);
            if (!showPopup) {
                this.setMessage('Backend unavailable during rotate; keeping current lease.');
            }
        }
        finally {
            this.updatePresentation();
        }
    }
    async requestNewLease() {
        this.log('Requesting a fresh auth lease');
        try {
            await (0, requestFreshLease_1.requestFreshLease)({
                currentLeaseId: this.state.leaseId,
                releaseCurrentLease: async () => {
                    if (!this.state.leaseId) {
                        return;
                    }
                    try {
                        await this.client.releaseLease(this.state.leaseId, {
                            machineId: this.state.machineId,
                            agentId: this.state.agentId,
                            reason: 'Manual fresh lease request from VS Code extension',
                        });
                    }
                    catch (error) {
                        this.log(`Existing lease release before fresh acquire failed: ${error instanceof Error ? error.message : String(error)}`);
                    }
                    finally {
                        this.state = await this.stateStore.clear(this.state.machineId, this.state.agentId, this.authFilePath());
                    }
                },
                acquireFreshLease: async () => {
                    await this.acquireAndMaterializeLease('manual request new lease');
                },
            });
            this.setMessage(`Fresh auth lease acquired for ${(0, statusPresentation_1.deriveAccountDisplayName)(this.state)}.`);
            void vscode.window.showInformationMessage(`Fresh auth lease acquired for ${(0, statusPresentation_1.deriveAccountDisplayName)(this.state)}.`);
        }
        catch (error) {
            await this.handleBackendError(error, 'Unable to request a fresh auth lease');
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
            this.state = await this.stateStore.clear(this.state.machineId, this.state.agentId, this.authFilePath());
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
        const target = `${baseUrl}/ui`;
        await vscode.env.openExternal(vscode.Uri.parse(target));
    }
    async deactivate() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = undefined;
        }
        if (this.telemetryTimer) {
            clearInterval(this.telemetryTimer);
            this.telemetryTimer = undefined;
        }
        if (this.releaseLeaseOnShutdown() && this.state?.leaseId) {
            try {
                await this.client.releaseLease(this.state.leaseId, {
                    machineId: this.state.machineId,
                    agentId: this.state.agentId,
                    reason: 'Released on VS Code shutdown',
                });
                this.log(`Released lease ${this.state.leaseId} during shutdown`);
            }
            catch (error) {
                this.log(`Shutdown release failed (continuing): ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        if (this.deleteAuthFileOnShutdown()) {
            try {
                const deleted = await (0, authFile_1.deleteAuthFile)(this.authFilePath());
                this.log(deleted ? `Deleted auth file at ${this.authFilePath()} on shutdown` : 'No auth file to delete on shutdown');
            }
            catch (error) {
                this.log(`Shutdown auth file delete failed (continuing): ${error instanceof Error ? error.message : String(error)}`);
            }
            this.state = await this.stateStore.clear(this.state.machineId, this.state.agentId, this.authFilePath());
        }
    }
    async acquireAndMaterializeLease(reason, showPopup = true) {
        this.log(`Acquiring lease (${reason})`);
        const previousLeaseId = this.state.leaseId;
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
            if (this.autoReloadWindowOnLeaseChange()
                && previousLeaseId
                && response.lease.id
                && response.lease.id !== previousLeaseId) {
                this.log(`Lease changed (${previousLeaseId} -> ${response.lease.id}); reloading window`);
                await vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
        }
        catch (error) {
            await this.handleBackendError(error, 'Unable to acquire lease', showPopup);
            if (!showPopup) {
                this.setMessage('Backend unavailable; will retry acquiring lease in background.');
            }
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
        const identity = (0, statusPresentation_1.extractAccountIdentity)(materialized);
        this.state = {
            ...this.state,
            accountLabel: identity.accountLabel,
            accountName: identity.accountName,
        };
        await this.stateStore.save(this.state);
        if (materialized.lease) {
            this.state = await this.stateStore.updateFromLease(this.state, materialized.lease);
        }
    }
    async writePayloadToAuthFile(payload) {
        const result = await (0, authFile_1.writeAuthFile)(this.authFilePath(), payload);
        this.state = { ...this.state, authFilePath: this.authFilePath() };
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
            const status = await this.client.getLease(this.state.leaseId);
            this.state = await this.stateStore.updateFromLeaseStatus(this.state, status);
            if (this.shouldRematerializeAuth(status)) {
                this.log(`Credential auth changed during telemetry for lease ${this.state.leaseId}; rematerializing`);
                await this.materializeAndWriteAuth(status.lease_id);
            }
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
    controllerInstance = new AuthManagerController(context);
    await controllerInstance.activate();
}
let controllerInstance = null;
async function deactivate() {
    if (!controllerInstance) {
        return;
    }
    await controllerInstance.deactivate();
    controllerInstance = null;
}
//# sourceMappingURL=extension.js.map