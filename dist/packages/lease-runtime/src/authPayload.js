export function validateAuthPayload(payload) {
    if (!payload || typeof payload !== 'object') {
        return false;
    }
    const record = payload;
    if (typeof record.auth_mode !== 'string') {
        return false;
    }
    if (record.OPENAI_API_KEY !== null) {
        return false;
    }
    const tokens = record.tokens;
    if (!tokens || typeof tokens !== 'object') {
        return false;
    }
    const tokenRecord = tokens;
    return ['id_token', 'access_token', 'refresh_token', 'account_id'].every((key) => typeof tokenRecord[key] === 'string');
}
export function expandHomePath(rawPath, homeDir) {
    if (!rawPath.startsWith('~')) {
        return rawPath;
    }
    const trimmedHome = homeDir.replace(/[\\/]+$/, '');
    const trimmedPath = rawPath.slice(1).replace(/^[/\\]+/, '');
    return `${trimmedHome}/${trimmedPath}`.replace(/\\/g, '/');
}
export function prepareAuthPayloadForWrite(payload, nowIso = new Date().toISOString()) {
    if (!validateAuthPayload(payload)) {
        throw new Error('Invalid auth payload shape');
    }
    return {
        ...payload,
        last_refresh: payload.last_refresh || nowIso,
    };
}
//# sourceMappingURL=authPayload.js.map