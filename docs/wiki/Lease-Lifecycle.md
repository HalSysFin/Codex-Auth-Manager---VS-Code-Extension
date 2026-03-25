# Lease Lifecycle

The extension:

1. ensures a lease on startup
2. writes leased auth into `~/.codex/auth.json`
3. refreshes the lease periodically
4. renews close-to-expiry leases
5. reacquires when the lease is no longer usable
