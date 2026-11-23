export interface UserRoleInfo {
  id: string;
  code: string;
  name: string;
}

export interface AuthUserInfo {
  id: string;
  email: string;
  fullName: string;
  role: UserRoleInfo;
  employeeId?: string;
  permissions?: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface AuthResponseData {
  user: AuthUserInfo;
  tokens: AuthTokens;
}

export interface StandardApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
  path: string;
  correlationId?: string;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  error: string;
  details?: any;
  timestamp: string;
  path: string;
  correlationId?: string;
}
