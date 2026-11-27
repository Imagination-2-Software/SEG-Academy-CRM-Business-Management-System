import 'reflect-metadata';
import { test, describe, beforeEach } from 'node:test';
import * as assert from 'node:assert/strict';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { NotificationsService } from '../notifications.service';
import { NotificationsController } from '../notifications.controller';
import { AuthenticatedUser } from '../../auth';

describe('NotificationsModule Unit Tests', () => {
  let service: NotificationsService;
  let controller: NotificationsController;
  let mockPrisma: any;

  const mockUser: AuthenticatedUser = {
    userId: 'user-uuid-1',
    email: 'user1@segacademy.org',
    fullName: 'Test User One',
    roles: ['STAFF'],
    role: { id: 'role-1', code: 'STAFF', name: 'Staff' },
    permissions: [],
  };

  const otherUser: AuthenticatedUser = {
    userId: 'user-uuid-2',
    email: 'user2@segacademy.org',
    fullName: 'Test User Two',
    roles: ['STUDENT'],
    role: { id: 'role-2', code: 'STUDENT', name: 'Student' },
    permissions: [],
  };

  beforeEach(() => {
    mockPrisma = {
      notification: {
        findMany: async () => [],
        findUnique: async () => null,
        update: async () => ({}),
        updateMany: async () => ({ count: 0 }),
        delete: async () => ({}),
      },
    };

    service = new NotificationsService(mockPrisma);
    controller = new NotificationsController(service);
  });

  describe('getUserNotifications()', () => {
    test('should return notifications mapped with category and link for the actor', async () => {
      const now = new Date();
      let queryArgs: any = null;
      mockPrisma.notification.findMany = async (args: any) => {
        queryArgs = args;
        return [
          {
            id: 'notif-1',
            userId: 'user-uuid-1',
            title: 'Invoice Due',
            body: 'Your invoice is ready.',
            channel: 'IN_APP',
            isRead: false,
            readAt: null,
            metadata: { category: 'BILLING', link: '/invoices/inv-1' },
            createdAt: now,
          },
        ];
      };

      const result = await controller.getNotifications(mockUser);

      assert.deepEqual(queryArgs, {
        where: { userId: mockUser.userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'notif-1');
      assert.equal(result[0].category, 'BILLING');
      assert.equal(result[0].link, '/invoices/inv-1');
      assert.equal(result[0].isRead, false);
    });

    test('should provide default category ADMISSIONS when metadata is missing', async () => {
      const now = new Date();
      mockPrisma.notification.findMany = async () => [
        {
          id: 'notif-2',
          userId: 'user-uuid-1',
          title: 'Welcome',
          body: 'Welcome to SEG Academy.',
          channel: 'IN_APP',
          isRead: true,
          readAt: now,
          metadata: null,
          createdAt: now,
        },
      ];

      const result = await controller.getNotifications(mockUser);
      assert.equal(result.length, 1);
      assert.equal(result[0].category, 'ADMISSIONS');
      assert.equal(result[0].link, undefined);
    });
  });

  describe('markAsRead()', () => {
    test('should successfully mark notification as read when owned by user', async () => {
      let updateArgs: any = null;
      mockPrisma.notification.findUnique = async (args: any) => {
        if (args.where.id === 'notif-1') {
          return { id: 'notif-1', userId: 'user-uuid-1', isRead: false };
        }
        return null;
      };
      mockPrisma.notification.update = async (args: any) => {
        updateArgs = args;
        return { id: 'notif-1', isRead: true };
      };

      const result = await controller.markAsRead('notif-1', mockUser);
      assert.deepEqual(result, { success: true });
      assert.equal(updateArgs.where.id, 'notif-1');
      assert.equal(updateArgs.data.isRead, true);
      assert.ok(updateArgs.data.readAt instanceof Date);
    });

    test('should throw NotFoundException if notification does not exist', async () => {
      mockPrisma.notification.findUnique = async () => null;

      await assert.rejects(
        async () => {
          await controller.markAsRead('notif-missing', mockUser);
        },
        (err: any) => {
          assert.ok(err instanceof NotFoundException);
          assert.match(err.message, /not found/i);
          return true;
        },
      );
    });

    test('should throw ForbiddenException if notification belongs to another user', async () => {
      mockPrisma.notification.findUnique = async () => ({
        id: 'notif-foreign',
        userId: otherUser.userId,
      });

      await assert.rejects(
        async () => {
          await controller.markAsRead('notif-foreign', mockUser);
        },
        (err: any) => {
          assert.ok(err instanceof ForbiddenException);
          assert.match(err.message, /permission/i);
          return true;
        },
      );
    });
  });

  describe('markAllAsRead()', () => {
    test('should mark all unread notifications as read for current user only', async () => {
      let updateManyArgs: any = null;
      mockPrisma.notification.updateMany = async (args: any) => {
        updateManyArgs = args;
        return { count: 4 };
      };

      const result = await controller.markAllAsRead(mockUser);
      assert.deepEqual(result, { success: true });
      assert.deepEqual(updateManyArgs.where, {
        userId: mockUser.userId,
        isRead: false,
      });
      assert.equal(updateManyArgs.data.isRead, true);
      assert.ok(updateManyArgs.data.readAt instanceof Date);
    });
  });

  describe('deleteNotification() (DELETE /notifications/:id)', () => {
    test('should successfully delete notification owned by current user', async () => {
      let deleteArgs: any = null;
      mockPrisma.notification.findUnique = async (args: any) => {
        if (args.where.id === 'notif-1') {
          return { id: 'notif-1', userId: mockUser.userId, title: 'Alert' };
        }
        return null;
      };
      mockPrisma.notification.delete = async (args: any) => {
        deleteArgs = args;
        return { id: 'notif-1' };
      };

      const result = await controller.deleteNotification('notif-1', mockUser);
      assert.deepEqual(result, { success: true });
      assert.deepEqual(deleteArgs, { where: { id: 'notif-1' } });
    });

    test('should throw NotFoundException when notification does not exist', async () => {
      let deleteCalled = false;
      mockPrisma.notification.findUnique = async () => null;
      mockPrisma.notification.delete = async () => {
        deleteCalled = true;
      };

      await assert.rejects(
        async () => {
          await controller.deleteNotification('notif-missing', mockUser);
        },
        (err: any) => {
          assert.ok(err instanceof NotFoundException);
          assert.match(err.message, /not found/i);
          return true;
        },
      );
      assert.equal(deleteCalled, false);
    });

    test('should throw ForbiddenException and prevent cross-user deletion', async () => {
      let deleteCalled = false;
      mockPrisma.notification.findUnique = async () => ({
        id: 'notif-other',
        userId: otherUser.userId, // Belongs to otherUser
      });
      mockPrisma.notification.delete = async () => {
        deleteCalled = true;
      };

      await assert.rejects(
        async () => {
          // mockUser attempts to delete otherUser's notification
          await controller.deleteNotification('notif-other', mockUser);
        },
        (err: any) => {
          assert.ok(err instanceof ForbiddenException);
          assert.match(err.message, /permission/i);
          return true;
        },
      );
      assert.equal(deleteCalled, false);
    });
  });
});
