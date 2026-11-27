import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface NotificationResponse {
  id: string;
  userId: string;
  title: string;
  body: string;
  channel: string;
  category: string;
  isRead: boolean;
  readAt?: Date | null;
  link?: string;
  createdAt: Date;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getUserNotifications(userId: string): Promise<NotificationResponse[]> {
    const list = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return list.map((item) => {
      const meta = item.metadata as Record<string, any> | null;
      return {
        id: item.id,
        userId: item.userId,
        title: item.title,
        body: item.body,
        channel: item.channel,
        category: (meta?.category as string) || 'ADMISSIONS',
        isRead: item.isRead,
        readAt: item.readAt,
        link: (meta?.link as string) || undefined,
        createdAt: item.createdAt,
      };
    });
  }

  async markAsRead(id: string, userId: string): Promise<{ success: boolean }> {
    await this.prisma.notification.updateMany({
      where: { id, userId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
    return { success: true };
  }

  async markAllAsRead(userId: string): Promise<{ success: boolean }> {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
    return { success: true };
  }
}
