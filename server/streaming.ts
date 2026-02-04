import type { Express, Request, Response } from "express";
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_WS_URL = process.env.LIVEKIT_URL;

// Convert wss:// to https:// for API calls
const LIVEKIT_API_URL = LIVEKIT_WS_URL?.replace("wss://", "https://");

let roomService: RoomServiceClient | null = null;
if (LIVEKIT_API_URL && LIVEKIT_API_KEY && LIVEKIT_API_SECRET) {
  roomService = new RoomServiceClient(
    LIVEKIT_API_URL,
    LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET,
  );
}

interface TokenRequest {
  roomName: string;
  participantName: string;
  isHost: boolean;
}

interface UploadThumbnailRequest {
  dataUri: string;
}

interface UpdateRoomMetadataRequest {
  title: string;
  thumbnailPath: string;
}

export function registerStreamingRoutes(app: Express) {
  app.post(
    "/api/streaming/token",
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { roomName, participantName, isHost } = req.body as TokenRequest;

        if (!roomName || !participantName) {
          res
            .status(400)
            .json({ error: "roomName and participantName required" });
          return;
        }

        if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_WS_URL) {
          res.status(500).json({
            error: "LiveKit credentials not configured",
          });
          return;
        }

        const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
          identity: participantName,
          name: participantName,
        });

        token.addGrant({
          room: roomName,
          roomJoin: true,
          canPublish: isHost,
          canSubscribe: true,
          canPublishData: true,
        });

        const jwt = await token.toJwt();

        res.json({
          token: jwt,
          wsUrl: LIVEKIT_WS_URL,
        });
      } catch (error) {
        console.error("Error generating streaming token:", error);
        res.status(500).json({ error: "Failed to generate token" });
      }
    },
  );

  app.get("/api/streaming/rooms", async (_req: Request, res: Response) => {
    try {
      if (!roomService) {
        res.json({ rooms: [] });
        return;
      }

      const rooms = await roomService.listRooms();
      const activeRooms = rooms.map((room) => ({
        name: room.name,
        numParticipants: room.numParticipants,
        createdAt: Number(room.creationTime),
        metadata: room.metadata || null,
      }));

      res.json({ rooms: activeRooms });
    } catch (error) {
      console.error("Error listing rooms:", error);
      res.json({ rooms: [] });
    }
  });

  // Upload show thumbnail (base64 data URI) and return a server-hosted path
  app.post(
    "/api/shows/thumbnail",
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { dataUri } = req.body as UploadThumbnailRequest;

        if (!dataUri || typeof dataUri !== "string") {
          res.status(400).json({ error: "dataUri required" });
          return;
        }

        const match = dataUri.match(
          /^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/,
        );
        if (!match) {
          res.status(400).json({ error: "Invalid dataUri format" });
          return;
        }

        const mimeType = match[1];
        const ext = mimeType.includes("png")
          ? "png"
          : mimeType.includes("webp")
            ? "webp"
            : "jpg";
        const base64 = match[3];

        const buffer = Buffer.from(base64, "base64");
        if (buffer.length === 0) {
          res.status(400).json({ error: "Empty image" });
          return;
        }

        const uploadsDir = path.resolve(process.cwd(), "uploads", "shows");
        fs.mkdirSync(uploadsDir, { recursive: true });
        const fileName = `${crypto.randomUUID()}.${ext}`;
        const filePath = path.join(uploadsDir, fileName);
        fs.writeFileSync(filePath, buffer);

        res.json({
          success: true,
          thumbnailPath: `/uploads/shows/${fileName}`,
        });
      } catch (error) {
        console.error("Error uploading thumbnail:", error);
        res.status(500).json({ error: "Failed to upload thumbnail" });
      }
    },
  );

  // Update LiveKit room metadata for a show (title + thumbnailPath)
  app.post(
    "/api/streaming/rooms/:roomName/metadata",
    async (req: Request, res: Response): Promise<void> => {
      try {
        const roomName = req.params.roomName as string;
        const { title, thumbnailPath } = req.body as UpdateRoomMetadataRequest;

        if (!roomService) {
          res.status(500).json({ error: "Room service not configured" });
          return;
        }

        if (!roomName || !title || !thumbnailPath) {
          res.status(400).json({ error: "title and thumbnailPath required" });
          return;
        }

        const metadata = JSON.stringify({
          title,
          thumbnailPath,
        });

        const updated = await roomService.updateRoomMetadata(
          roomName,
          metadata,
        );
        res.json({
          success: true,
          room: { name: updated.name, metadata: updated.metadata },
        });
      } catch (error) {
        console.error("Error updating room metadata:", error);
        res.status(500).json({ error: "Failed to update room metadata" });
      }
    },
  );

  // End a room - force delete it from LiveKit
  app.delete(
    "/api/streaming/rooms/:roomName",
    async (req: Request, res: Response) => {
      try {
        const roomName = req.params.roomName as string;
        console.log(`[Streaming] Attempting to delete room: ${roomName}`);

        if (!roomService) {
          res.status(500).json({ error: "Room service not configured" });
          return;
        }

        // List rooms first to check if it exists
        const rooms = await roomService.listRooms();
        const roomExists = rooms.some((r) => r.name === roomName);
        console.log(
          `[Streaming] Room exists: ${roomExists}, available rooms:`,
          rooms.map((r) => r.name),
        );

        if (!roomExists) {
          // Room doesn't exist - that's fine, consider it deleted
          res.json({
            success: true,
            message: `Room ${roomName} already ended or doesn't exist`,
          });
          return;
        }

        await roomService.deleteRoom(roomName);
        console.log(`[Streaming] Room deleted: ${roomName}`);

        res.json({ success: true, message: `Room ${roomName} ended` });
      } catch (error) {
        console.error("Error deleting room:", error);
        res.status(500).json({
          error: "Failed to end room",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );
}
