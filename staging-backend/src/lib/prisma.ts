import { PrismaClient } from '@prisma/client';
import { sseManager } from './sseManager';

const basePrisma = new PrismaClient();

const prisma = basePrisma.$extends({
  query: {
    inAppNotification: {
      async create({ args, query }) {
        const result = await query(args);
        // After creation, send SSE (userId may be undefined on some notification types)
        if (result.userId) {
          sseManager.sendToUser(result.userId, 'notification', {
            id: result.id,
            title: result.title,
            message: result.message,
            read: result.read,
            unread: !result.read,
            link: result.link,
            createdAt: result.createdAt,
          });
        }
        return result;
      },
      async createMany({ args, query }) {
        const result = await query(args);
        // createMany doesn't return the inserted rows, so we extract from args
        const dataArray = Array.isArray(args.data) ? args.data : [args.data];
        dataArray.forEach(data => {
          if (data.userId) {
            sseManager.sendToUser(data.userId, 'notification', {
              title: data.title,
              message: data.message,
              unread: true,
              link: data.link || null,
            });
          }
        });
        return result;
      }
    },
    adminNotification: {
      async create({ args, query }) {
        const result = await query(args);
        sseManager.broadcastToAdmins('notification', {
          id: result.id,
          title: result.title,
          message: result.message,
          read: result.read,
          unread: !result.read,
          link: result.link,
          createdAt: result.createdAt,
        });
        return result;
      },
      async createMany({ args, query }) {
        const result = await query(args);
        // createMany does not return row ids — callers needing SSE dedup must use create() instead.
        const dataArray = Array.isArray(args.data) ? args.data : [args.data];
        dataArray.forEach((data) => {
          sseManager.broadcastToAdmins('notification', {
            title: data.title,
            message: data.message,
            unread: true,
            link: data.link || null,
          });
        });
        return result;
      }
    }
  }
});

export default prisma;
