import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Public, Roles, Permissions, CurrentUser, AuthenticatedUser } from './auth';

@ApiTags('Test / Diagnostic Endpoints')
@Controller('test-access')
export class TestAccessController {
  @Public()
  @Get('public')
  @ApiOperation({ summary: 'Public route accessible without authentication' })
  getPublic() {
    return { status: 'ok', access: 'public', timestamp: new Date().toISOString() };
  }

  @Get('authenticated')
  @ApiBearerAuth('bearer-jwt')
  @ApiOperation({ summary: 'Protected route accessible by any active authenticated user' })
  getAuthenticated(@CurrentUser() user: AuthenticatedUser) {
    return {
      status: 'ok',
      access: 'authenticated',
      user: {
        userId: user.userId,
        email: user.email,
        roles: user.roles,
        permissions: user.permissions,
      },
    };
  }

  @Roles('ADMIN', 'FOUNDER_SUPER_ADMIN')
  @Get('admin-only')
  @ApiBearerAuth('bearer-jwt')
  @ApiOperation({ summary: 'Protected route restricted to ADMIN or FOUNDER_SUPER_ADMIN' })
  getAdminOnly(@CurrentUser() user: AuthenticatedUser) {
    return { status: 'ok', access: 'admin-granted', userId: user.userId };
  }

  @Roles('FINANCE_MANAGER')
  @Get('finance-only')
  @ApiBearerAuth('bearer-jwt')
  @ApiOperation({ summary: 'Protected route restricted to FINANCE_MANAGER' })
  getFinanceOnly(@CurrentUser() user: AuthenticatedUser) {
    return { status: 'ok', access: 'finance-granted', userId: user.userId };
  }

  @Permissions('students:read')
  @Get('students-read')
  @ApiBearerAuth('bearer-jwt')
  @ApiOperation({ summary: 'Protected route requiring students:read permission' })
  getStudentsRead(@CurrentUser() user: AuthenticatedUser) {
    return { status: 'ok', access: 'students:read-granted', userId: user.userId };
  }

  @Permissions('invoices:approve', 'invoices:read')
  @Get('invoices-multi-perm')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Protected route requiring both invoices:approve and invoices:read' })
  getInvoicesMultiPerm(@CurrentUser() user: AuthenticatedUser) {
    return { status: 'ok', access: 'invoices-multi-granted', userId: user.userId };
  }
}
