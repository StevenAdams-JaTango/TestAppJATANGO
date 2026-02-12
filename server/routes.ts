import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { registerStreamingRoutes } from "./streaming";
import { registerPaymentRoutes } from "./payments";
import { registerShippingRoutes } from "./shipping";
import { registerShowRoutes } from "./shows";
import { registerNotificationRoutes } from "./notifications";

export async function registerRoutes(app: Express): Promise<Server> {
  // Register streaming routes for LiveKit
  registerStreamingRoutes(app);

  // Register Stripe payment routes
  registerPaymentRoutes(app);

  // Register shipping & sales routes
  registerShippingRoutes(app);

  // Register live show cart/sales routes
  registerShowRoutes(app);

  // Register SSE notification routes
  registerNotificationRoutes(app);

  const httpServer = createServer(app);

  return httpServer;
}
