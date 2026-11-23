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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
exports.PasswordService = exports.ARGON2_OPTIONS = void 0;
const common_1 = require("@nestjs/common");
const argon2 = __importStar(require("@node-rs/argon2"));
const crypto = __importStar(require("crypto"));
exports.ARGON2_OPTIONS = {
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
    algorithm: 2,
};
let PasswordService = class PasswordService {
    async hashPassword(password) {
        if (!password || typeof password !== 'string') {
            throw new Error('Password must be a non-empty string.');
        }
        return argon2.hash(password, exports.ARGON2_OPTIONS);
    }
    async verifyPassword(hash, candidate) {
        if (!hash || !candidate || typeof hash !== 'string' || typeof candidate !== 'string') {
            return false;
        }
        try {
            return await argon2.verify(hash, candidate);
        }
        catch {
            return false;
        }
    }
    generateRandomToken(byteLength = 32) {
        return crypto.randomBytes(byteLength).toString('hex');
    }
    hashToken(token) {
        if (!token || typeof token !== 'string') {
            throw new Error('Token must be a non-empty string.');
        }
        return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
    }
};
exports.PasswordService = PasswordService;
exports.PasswordService = PasswordService = __decorate([
    (0, common_1.Injectable)()
], PasswordService);
//# sourceMappingURL=password.service.js.map