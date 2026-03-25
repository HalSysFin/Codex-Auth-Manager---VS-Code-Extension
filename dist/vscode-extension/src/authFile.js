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
exports.validateAuthPayload = void 0;
exports.expandHomePath = expandHomePath;
exports.authFileExists = authFileExists;
exports.readAuthFile = readAuthFile;
exports.writeAuthFile = writeAuthFile;
exports.deleteAuthFile = deleteAuthFile;
const fs = __importStar(require("node:fs/promises"));
const os = __importStar(require("node:os"));
const path = __importStar(require("node:path"));
const authPayload_js_1 = require("../../packages/lease-runtime/src/authPayload.js");
Object.defineProperty(exports, "validateAuthPayload", { enumerable: true, get: function () { return authPayload_js_1.validateAuthPayload; } });
function expandHomePath(rawPath) {
    return path.resolve((0, authPayload_js_1.expandHomePath)(rawPath, os.homedir()));
}
async function authFileExists(authFilePath) {
    try {
        await fs.access(expandHomePath(authFilePath));
        return true;
    }
    catch {
        return false;
    }
}
async function readAuthFile(authFilePath) {
    const fullPath = expandHomePath(authFilePath);
    try {
        const content = await fs.readFile(fullPath, 'utf8');
        const parsed = JSON.parse(content);
        return (0, authPayload_js_1.validateAuthPayload)(parsed) ? parsed : null;
    }
    catch {
        return null;
    }
}
async function writeAuthFile(authFilePath, payload) {
    if (!(0, authPayload_js_1.validateAuthPayload)(payload)) {
        throw new Error('Invalid auth payload shape');
    }
    const fullPath = expandHomePath(authFilePath);
    const dir = path.dirname(fullPath);
    const writtenAt = new Date().toISOString();
    const finalPayload = (0, authPayload_js_1.prepareAuthPayloadForWrite)(payload, writtenAt);
    const tempPath = `${fullPath}.tmp-${process.pid}-${Date.now()}`;
    await fs.mkdir(dir, { recursive: true });
    const fileHandle = await fs.open(tempPath, 'w');
    try {
        await fileHandle.writeFile(`${JSON.stringify(finalPayload, null, 2)}\n`, 'utf8');
        await fileHandle.sync();
    }
    finally {
        await fileHandle.close();
    }
    await fs.rename(tempPath, fullPath);
    return { path: fullPath, writtenAt };
}
async function deleteAuthFile(authFilePath) {
    const fullPath = expandHomePath(authFilePath);
    try {
        await fs.unlink(fullPath);
        return true;
    }
    catch (error) {
        if (error?.code === 'ENOENT') {
            return false;
        }
        throw error;
    }
}
//# sourceMappingURL=authFile.js.map