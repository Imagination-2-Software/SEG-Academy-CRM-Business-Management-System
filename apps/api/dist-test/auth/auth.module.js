"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const auth_service_1 = require("./auth.service");
const auth_controller_1 = require("./auth.controller");
const password_service_1 = require("./password.service");
const token_service_1 = require("./token.service");
const password_reset_service_1 = require("./password-reset.service");
const token_storage_service_1 = require("./token-storage.service");
const email_module_1 = require("../email/email.module");
const audit_module_1 = require("../audit/audit.module");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [config_1.ConfigModule, email_module_1.EmailModule, audit_module_1.AuditModule],
        controllers: [auth_controller_1.AuthController],
        providers: [
            auth_service_1.AuthService,
            password_service_1.PasswordService,
            token_service_1.TokenService,
            password_reset_service_1.PasswordResetService,
            token_storage_service_1.TokenStorageService,
        ],
        exports: [
            auth_service_1.AuthService,
            password_service_1.PasswordService,
            token_service_1.TokenService,
            password_reset_service_1.PasswordResetService,
            token_storage_service_1.TokenStorageService,
        ],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map