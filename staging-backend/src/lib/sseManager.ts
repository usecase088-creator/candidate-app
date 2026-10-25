import { Response } from 'express';
import logger from './logger';

class SSEManager {
  // Map of userId -> Set of Express Responses
  private userClients: Map<string, Set<Response>> = new Map();
  // Set of Admin Express Responses
  private adminClients: Set<Response> = new Set();
  
  private heartbeatInterval: NodeJS.Timeout;

  constructor() {
    // Send a heartbeat every 30 seconds to keep connections alive
    // across proxies (Nginx, ALB, etc.)
    this.heartbeatInterval = setInterval(() => {
      this.broadcastHeartbeat();
    }, 30000);
  }

  /**
   * Registers a regular user connection (Recruiter/Candidate)
   */
  public addUserClient(userId: string, res: Response) {
    if (!this.userClients.has(userId)) {
      this.userClients.set(userId, new Set());
    }
    this.userClients.get(userId)!.add(res);

    this.setupConnection(res, () => {
      this.userClients.get(userId)?.delete(res);
      if (this.userClients.get(userId)?.size === 0) {
        this.userClients.delete(userId);
      }
    });
  }

  /**
   * Registers an Admin connection
   */
  public addAdminClient(res: Response) {
    this.adminClients.add(res);

    this.setupConnection(res, () => {
      this.adminClients.delete(res);
    });
  }

  /**
   * Standard SSE headers and cleanup listener
   */
  private setupConnection(res: Response, onCleanup: () => void) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      // Allow CORS if necessary (though usually handled by middleware)
    });

    // Send an initial event so the client knows it's connected
    res.write(`event: connected\ndata: {"status": "ok"}\n\n`);

    reqCloseHandler(res, onCleanup);
  }

  /**
   * Send event to a specific user
   */
  public sendToUser(userId: string, eventName: string, data: any) {
    const clients = this.userClients.get(userId);
    if (!clients) return;

    const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    clients.forEach((res) => {
      try {
        res.write(payload);
      } catch (err) {
        logger.error(`Error sending SSE to user ${userId}`, err);
      }
    });
  }

  /**
   * Broadcast event to all connected admins
   */
  public broadcastToAdmins(eventName: string, data: any) {
    const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    this.adminClients.forEach((res) => {
      try {
        res.write(payload);
      } catch (err) {
        logger.error(`Error sending SSE to admin`, err);
      }
    });
  }

  /**
   * Broadcast a heartbeat ping to prevent connection drops
   */
  private broadcastHeartbeat() {
    const payload = `:\n\n`; // SSE comment payload (ping)
    
    // Ping users
    this.userClients.forEach((clients) => {
      clients.forEach((res) => {
        res.write(payload);
      });
    });

    // Ping admins
    this.adminClients.forEach((res) => {
      res.write(payload);
    });
  }
}

// Helper to handle client disconnect
function reqCloseHandler(res: Response, onCleanup: () => void) {
  res.on('close', onCleanup);
  res.on('error', onCleanup);
}

// Export singleton instance
export const sseManager = new SSEManager();
