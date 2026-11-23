"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryUsersDto = exports.ReplaceUserRolesDto = exports.UpdateUserStatusDto = exports.UpdateUserDto = exports.CreateUserDto = exports.AccountStatusEnum = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
var AccountStatusEnum;
(function (AccountStatusEnum) {
    AccountStatusEnum["ACTIVE"] = "ACTIVE";
    AccountStatusEnum["INACTIVE"] = "INACTIVE";
    AccountStatusEnum["SUSPENDED"] = "SUSPENDED";
    AccountStatusEnum["INVITED"] = "INVITED";
})(AccountStatusEnum || (exports.AccountStatusEnum = AccountStatusEnum = {}));
class CreateUserDto {
    email;
    fullName;
    phoneNumber;
    password;
    roleId;
    status;
    avatarUrl;
}
exports.CreateUserDto = CreateUserDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'john.doe@segacademy.com',
        description: 'Unique employee email address',
    }),
    (0, class_validator_1.IsEmail)({}, { message: 'Must be a valid email address.' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Email is required.' }),
    __metadata("design:type", String)
], CreateUserDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'John Doe',
        description: 'Full legal name of the employee',
    }),
    (0, class_validator_1.IsString)({ message: 'Full name must be a string.' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Full name is required.' }),
    (0, class_validator_1.MinLength)(2, { message: 'Full name must be at least 2 characters.' }),
    (0, class_validator_1.MaxLength)(100, { message: 'Full name cannot exceed 100 characters.' }),
    __metadata("design:type", String)
], CreateUserDto.prototype, "fullName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: '+919876543210',
        description: 'Contact phone number',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ message: 'Phone number must be a string.' }),
    (0, class_validator_1.MaxLength)(20, { message: 'Phone number cannot exceed 20 characters.' }),
    __metadata("design:type", String)
], CreateUserDto.prototype, "phoneNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'ComplexP@ssw0rd2026!',
        description: 'Initial account password (minimum 8 characters)',
    }),
    (0, class_validator_1.IsString)({ message: 'Password must be a string.' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Initial password is required.' }),
    (0, class_validator_1.MinLength)(8, { message: 'Password must be at least 8 characters long.' }),
    (0, class_validator_1.MaxLength)(128, { message: 'Password cannot exceed 128 characters.' }),
    __metadata("design:type", String)
], CreateUserDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'role-uuid-1234',
        description: 'Authoritative Role ID to assign',
    }),
    (0, class_validator_1.IsString)({ message: 'Role ID must be a string.' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Role ID is required.' }),
    __metadata("design:type", String)
], CreateUserDto.prototype, "roleId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        enum: AccountStatusEnum,
        default: AccountStatusEnum.ACTIVE,
        description: 'Initial account status',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(AccountStatusEnum, { message: 'Invalid account status.' }),
    __metadata("design:type", String)
], CreateUserDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'https://cdn.segacademy.com/avatars/user.png',
        description: 'Avatar image URL',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ message: 'Avatar URL must be a string.' }),
    __metadata("design:type", String)
], CreateUserDto.prototype, "avatarUrl", void 0);
class UpdateUserDto {
    fullName;
    phoneNumber;
    avatarUrl;
}
exports.UpdateUserDto = UpdateUserDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'John Jonathan Doe',
        description: 'Updated full name',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ message: 'Full name must be a string.' }),
    (0, class_validator_1.MinLength)(2, { message: 'Full name must be at least 2 characters.' }),
    (0, class_validator_1.MaxLength)(100, { message: 'Full name cannot exceed 100 characters.' }),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "fullName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: '+919876543211',
        description: 'Updated phone number',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ message: 'Phone number must be a string.' }),
    (0, class_validator_1.MaxLength)(20, { message: 'Phone number cannot exceed 20 characters.' }),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "phoneNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'https://cdn.segacademy.com/avatars/new-avatar.png',
        description: 'Updated avatar URL',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ message: 'Avatar URL must be a string.' }),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "avatarUrl", void 0);
class UpdateUserStatusDto {
    status;
    reason;
}
exports.UpdateUserStatusDto = UpdateUserStatusDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: AccountStatusEnum,
        example: AccountStatusEnum.SUSPENDED,
        description: 'Target account status',
    }),
    (0, class_validator_1.IsEnum)(AccountStatusEnum, { message: 'Status must be ACTIVE, INACTIVE, SUSPENDED, or INVITED.' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Status is required.' }),
    __metadata("design:type", String)
], UpdateUserStatusDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'Employee resigned or security suspension',
        description: 'Reason for status modification',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], UpdateUserStatusDto.prototype, "reason", void 0);
class ReplaceUserRolesDto {
    roleIds;
}
exports.ReplaceUserRolesDto = ReplaceUserRolesDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: ['role-uuid-1234'],
        description: 'Array of target Role IDs (currently single primary role in schema)',
    }),
    (0, class_validator_1.IsArray)({ message: 'Role IDs must be an array.' }),
    (0, class_validator_1.ArrayMinSize)(1, { message: 'At least one role ID must be provided.' }),
    (0, class_validator_1.IsString)({ each: true, message: 'Each role ID must be a string.' }),
    __metadata("design:type", Array)
], ReplaceUserRolesDto.prototype, "roleIds", void 0);
class QueryUsersDto {
    page = 1;
    limit = 20;
    search;
    status;
    roleCode;
}
exports.QueryUsersDto = QueryUsersDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 1,
        default: 1,
        description: 'Page number (minimum 1)',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], QueryUsersDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 20,
        default: 20,
        description: 'Items per page (max 100)',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], QueryUsersDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'john',
        description: 'Fuzzy search by name, email, or phone number',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], QueryUsersDto.prototype, "search", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        enum: AccountStatusEnum,
        description: 'Filter by account status',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(AccountStatusEnum),
    __metadata("design:type", String)
], QueryUsersDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'ADMIN',
        description: 'Filter by role code',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], QueryUsersDto.prototype, "roleCode", void 0);
//# sourceMappingURL=users.dto.js.map