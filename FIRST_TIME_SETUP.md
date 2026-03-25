# CAM - VS Code Extension First-Time Setup

This guide walks through first-time setup for the CAM VS Code extension.

## 1. Install the extension

Install from VSIX:

```bash
code --install-extension /path/to/codex-auth-manager-extension-<version>.vsix --force
```

Or use **Install from VSIX...** in the Extensions UI.

## 2. Open extension settings

Set these at minimum:

- `authManager.baseUrl`
- `authManager.internalApiToken`

Optional but recommended:

- `authManager.machineId`
- `authManager.agentId`
- `authManager.authFilePath`

If machine or agent ID are left blank, the extension will generate stable defaults.

## 3. Check the backend

Make sure CAM Auth Manager is reachable from the machine running the extension.

Typical local backend:

- `http://127.0.0.1:8080`

## 4. Verify lease flow

After install and configuration:

1. run **Auth Manager: Ensure Lease**
2. confirm a lease is acquired or reused
3. confirm `~/.codex/auth.json` is written
4. confirm the lease appears in the CAM manager UI

## 5. Optional behaviors

You may also want to enable:

```json
{
  "authManager.autoReloadWindowOnLeaseChange": true,
  "authManager.releaseLeaseOnShutdown": true,
  "authManager.deleteAuthFileOnShutdown": true
}
```

## 6. Verify auth switching

Confirm the extension has updated:

- the lease state in the extension UI
- the active auth file at `~/.codex/auth.json`

## 7. Troubleshooting

If the extension is not updating auth:

- check `authManager.baseUrl`
- check `authManager.internalApiToken`
- confirm the backend supports `/api/leases/{lease_id}/materialize`
- confirm the machine can reach the backend
