import { Room, RoomEvent, ConnectionState, Track } from "livekit-client";
import { getApiUrl } from "@/lib/query-client";

export interface StreamConfig {
  roomName: string;
  participantName: string;
  isHost: boolean;
}

export interface StreamToken {
  token: string;
  wsUrl: string;
}

export interface StreamStats {
  connectionQuality: "excellent" | "good" | "poor" | "unknown";
  bitrate: number;
  latency: number;
}

export interface UploadThumbnailResponse {
  success: boolean;
  thumbnailPath: string;
}

class StreamingService {
  private room: Room | null = null;
  private connectionState: ConnectionState = ConnectionState.Disconnected;

  async getToken(config: StreamConfig): Promise<StreamToken> {
    const apiUrl = getApiUrl().replace(/\/$/, "");
    const url = `${apiUrl}/api/streaming/token`;
    console.log("[Streaming] Requesting token from:", url);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomName: config.roomName,
          participantName: config.participantName,
          isHost: config.isHost,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Streaming] Token error:", response.status, errorText);
        throw new Error(`Failed to get streaming token: ${response.status}`);
      }

      const data = await response.json();
      console.log("[Streaming] Got token, wsUrl:", data.wsUrl);
      return data;
    } catch (error) {
      console.error("[Streaming] Network error:", error);
      throw error;
    }
  }

  async uploadShowThumbnail(dataUri: string): Promise<string> {
    const apiUrl = getApiUrl().replace(/\/$/, "");
    const url = `${apiUrl}/api/shows/thumbnail`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataUri }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(
        `Failed to upload thumbnail: ${response.status} ${errText}`,
      );
    }

    const data = (await response.json()) as UploadThumbnailResponse;
    return data.thumbnailPath;
  }

  async updateRoomMetadata(params: {
    roomName: string;
    title: string;
    thumbnailPath: string;
  }): Promise<void> {
    const apiUrl = getApiUrl().replace(/\/$/, "");
    const url = `${apiUrl}/api/streaming/rooms/${encodeURIComponent(params.roomName)}/metadata`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: params.title,
        thumbnailPath: params.thumbnailPath,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(
        `Failed to update room metadata: ${response.status} ${errText}`,
      );
    }
  }

  async connect(token: string, wsUrl: string): Promise<Room> {
    this.room = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: {
          width: 1920,
          height: 1080,
          frameRate: 30,
        },
        facingMode: "user",
        deviceId: undefined,
      },
      publishDefaults: {
        videoCodec: "h264",
        dtx: true,
        red: true,
        simulcast: true,
        videoSimulcastLayers: [
          {
            width: 1920,
            height: 1080,
            resolution: {
              width: 1920,
              height: 1080,
              frameRate: 30,
            },
            encoding: {
              maxBitrate: 5_000_000,
              maxFramerate: 30,
            },
          },
          {
            width: 1280,
            height: 720,
            resolution: {
              width: 1280,
              height: 720,
              frameRate: 30,
            },
            encoding: {
              maxBitrate: 2_500_000,
              maxFramerate: 30,
            },
          },
          {
            width: 640,
            height: 360,
            resolution: {
              width: 640,
              height: 360,
              frameRate: 30,
            },
            encoding: {
              maxBitrate: 800_000,
              maxFramerate: 30,
            },
          },
        ],
        videoEncoding: {
          maxBitrate: 5_000_000,
          maxFramerate: 30,
        },
        screenShareEncoding: {
          maxBitrate: 5_000_000,
          maxFramerate: 30,
        },
      },
    });

    this.room.on(RoomEvent.ConnectionStateChanged, (state) => {
      this.connectionState = state;
    });

    await this.room.connect(wsUrl, token);
    return this.room;
  }

  async publishTracks(video: boolean = true, audio: boolean = true) {
    if (!this.room) throw new Error("Not connected to room");

    // Force high quality video constraints
    const videoConstraints = {
      width: { ideal: 1920, min: 1280 },
      height: { ideal: 1080, min: 720 },
      frameRate: { ideal: 30, min: 24 },
      aspectRatio: { ideal: 16 / 9 },
    };

    await this.room.localParticipant.enableCameraAndMicrophone();

    // Apply quality constraints to video track
    if (video) {
      const videoTrack = this.room.localParticipant.videoTrackPublications
        .values()
        .next().value?.track;
      if (videoTrack) {
        try {
          // @ts-ignore - accessing underlying MediaStreamTrack
          const mediaStreamTrack = videoTrack.mediaStreamTrack;
          if (mediaStreamTrack && "applyConstraints" in mediaStreamTrack) {
            await mediaStreamTrack.applyConstraints(videoConstraints);
          }
        } catch (error) {
          console.warn("Failed to apply video constraints:", error);
        }
      }
    }

    if (!video) {
      await this.room.localParticipant.setCameraEnabled(false);
    }
    if (!audio) {
      await this.room.localParticipant.setMicrophoneEnabled(false);
    }
  }

  async setMicrophoneEnabled(enabled: boolean) {
    if (!this.room) return;
    await this.room.localParticipant.setMicrophoneEnabled(enabled);
  }

  async setCameraEnabled(enabled: boolean) {
    if (!this.room) return;
    await this.room.localParticipant.setCameraEnabled(enabled);
  }

  async switchCamera() {
    if (!this.room) return;
    const cameraPub = this.room.localParticipant.getTrackPublication(
      Track.Source.Camera,
    );
    if (cameraPub?.track) {
      const videoTrack = cameraPub.track;
      if ("switchDevice" in videoTrack) {
        // @ts-ignore - switchDevice exists on LocalVideoTrack
        await videoTrack.switchDevice("environment");
      }
    }
  }

  getRoom(): Room | null {
    return this.room;
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  isConnected(): boolean {
    return this.connectionState === ConnectionState.Connected;
  }

  async disconnect() {
    if (this.room) {
      await this.room.disconnect();
      this.room = null;
    }
    this.connectionState = ConnectionState.Disconnected;
  }

  // End the room on the server (force delete from LiveKit)
  async endRoom(roomName: string): Promise<void> {
    const apiUrl = getApiUrl().replace(/\/$/, "");
    const url = `${apiUrl}/api/streaming/rooms/${encodeURIComponent(roomName)}`;
    console.log("[Streaming] Ending room:", roomName);

    try {
      const response = await fetch(url, { method: "DELETE" });
      if (!response.ok) {
        console.error("[Streaming] Failed to end room:", response.status);
      } else {
        console.log("[Streaming] Room ended successfully");
      }
    } catch (error) {
      console.error("[Streaming] Error ending room:", error);
    }
  }

  getStats(): StreamStats {
    if (!this.room || !this.isConnected()) {
      return { connectionQuality: "unknown", bitrate: 0, latency: 0 };
    }

    const quality = this.room.localParticipant.connectionQuality;
    let connectionQuality: StreamStats["connectionQuality"] = "unknown";

    switch (quality) {
      case "excellent":
        connectionQuality = "excellent";
        break;
      case "good":
        connectionQuality = "good";
        break;
      case "poor":
        connectionQuality = "poor";
        break;
      default:
        connectionQuality = "unknown";
    }

    return {
      connectionQuality,
      bitrate: 0,
      latency: 0,
    };
  }
}

export const streamingService = new StreamingService();
