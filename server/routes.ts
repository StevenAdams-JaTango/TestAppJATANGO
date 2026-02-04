import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { registerStreamingRoutes } from "./streaming";

export async function registerRoutes(app: Express): Promise<Server> {
  // Register streaming routes for LiveKit
  registerStreamingRoutes(app);

  const httpServer = createServer(app);

  return httpServer;
}
