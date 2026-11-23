"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkipRateLimit = exports.RateLimit = exports.RATE_LIMIT_SKIP_KEY = exports.RATE_LIMIT_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.RATE_LIMIT_KEY = 'RATE_LIMIT_METADATA';
exports.RATE_LIMIT_SKIP_KEY = 'RATE_LIMIT_SKIP_METADATA';
const RateLimit = (options) => (0, common_1.SetMetadata)(exports.RATE_LIMIT_KEY, options);
exports.RateLimit = RateLimit;
const SkipRateLimit = () => (0, common_1.SetMetadata)(exports.RATE_LIMIT_SKIP_KEY, true);
exports.SkipRateLimit = SkipRateLimit;
//# sourceMappingURL=rate-limit.decorator.js.map