import type { Express, Request, Response } from "express";

/**
 * In-memory map of userId → array of SSE response objects.
 * When a notification is sent, we write to all connected SSE clients for that user.
 */
const clients = new Map<string, Response[]>();

/**
 * Send a notification to all connected SSE clients for a given user.
 */
export function emitNotification(
  userId: string,
  data: { title: string; body: string; type: string },
) {
  const userClients = clients.get(userId);
  if (!userClients || userClients.length === 0) {
    console.log(
      `[SSE] No connected clients for user ${userId}, notification queued in DB only`,
    );
    return;
  }

  const payload = `data: ${JSON.stringify(data)}\n\n`;
  console.log(
    `[SSE] Sending notification to ${userClients.length} client(s) for user ${userId}`,
  );

  for (const res of userClients) {
    res.write(payload);
  }
}

export function registerNotificationRoutes(app: Express) {
  /**
   * GET /api/notifications/stream?userId=xxx
   * SSE endpoint — client connects and keeps the connection open.
   */
  app.get("/api/notifications/stream", (req: Request, res: Response) => {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    console.log(`[SSE] Client connected for user ${userId}`);

    // Set SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });

    // Send initial heartbeat so client knows connection is alive
    res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

    // Add this response to the clients map
    if (!clients.has(userId)) {
      clients.set(userId, []);
    }
    clients.get(userId)!.push(res);

    // Send heartbeat every 30s to keep connection alive
    const heartbeat = setInterval(() => {
      res.write(": heartbeat\n\n");
    }, 30000);

    // Clean up on disconnect
    req.on("close", () => {
      console.log(`[SSE] Client disconnected for user ${userId}`);
      clearInterval(heartbeat);
      const userClients = clients.get(userId);
      if (userClients) {
        const idx = userClients.indexOf(res);
        if (idx !== -1) userClients.splice(idx, 1);
        if (userClients.length === 0) clients.delete(userId);
      }
    });
  });

  /**
   * POST /api/notifications/test
   * Test endpoint to manually trigger a notification.
   */
  app.post("/api/notifications/test", (req: Request, res: Response) => {
    const { userId, title, body } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    emitNotification(userId, {
      title: title || "Test Notification",
      body: body || "This is a test!",
      type: "test",
    });

    return res.json({ ok: true });
  });
}
