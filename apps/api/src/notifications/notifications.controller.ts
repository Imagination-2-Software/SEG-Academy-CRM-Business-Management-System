import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { NotificationsService, NotificationResponse } from './notifications.service';
import { CurrentUser, AuthenticatedUser } from '../auth';

@ApiTags('Notifications')
@ApiBearerAuth('bearer-jwt')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user notifications' })
  @ApiResponse({ status: 200, description: 'List of notifications for current user' })
  async getNotifications(
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<NotificationResponse[]> {
    return this.notificationsService.getUserNotifications(actor.userId);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.notificationsService.markAsRead(id, actor.userId);
  }

  @Post('mark-all-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all current user notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(@CurrentUser() actor: AuthenticatedUser) {
    return this.notificationsService.markAllAsRead(actor.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete/clear a notification for the current user' })
  @ApiResponse({ status: 200, description: 'Notification successfully deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot delete another user notification' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async deleteNotification(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.notificationsService.deleteNotification(id, actor.userId);
  }
}
