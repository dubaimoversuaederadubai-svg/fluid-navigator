import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = http.createServer(app);

// ─── In-App Call WebSocket Relay ─────────────────────────────────────────────
const callRooms = new Map<string, { rider: WebSocket | null; driver: WebSocket | null }>();

const wss = new WebSocketServer({ server, path: "/ws/call" });

wss.on("connection", (ws) => {
  let roomId: string | null = null;
  let party: "rider" | "driver" | null = null;
  let pingTimer: NodeJS.Timeout | null = null;

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === "join" && msg.rideId && msg.party) {
        roomId = msg.rideId;
        party = msg.party;
        if (!callRooms.has(roomId)) callRooms.set(roomId, { rider: null, driver: null });
        const room = callRooms.get(roomId)!;
        room[party] = ws;
        ws.send(JSON.stringify({ type: "joined", party }));
        const other = party === "rider" ? "driver" : "rider";
        const otherWs = room[other];
        if (otherWs?.readyState === WebSocket.OPEN) {
          otherWs.send(JSON.stringify({ type: "peer_joined", party }));
          ws.send(JSON.stringify({ type: "peer_joined", party: other }));
        }
        pingTimer = setInterval(() => { if (ws.readyState === WebSocket.OPEN) ws.ping(); }, 25000);
        return;
      }

      if (msg.type === "audio" && roomId && party) {
        const room = callRooms.get(roomId);
        if (!room) return;
        const other = party === "rider" ? "driver" : "rider";
        const otherWs = room[other];
        if (otherWs?.readyState === WebSocket.OPEN) {
          otherWs.send(JSON.stringify({ type: "audio", data: msg.data, from: party }));
        }
        return;
      }

      if (msg.type === "end" && roomId && party) {
        const room = callRooms.get(roomId);
        if (room) {
          const other = party === "rider" ? "driver" : "rider";
          const otherWs = room[other];
          if (otherWs?.readyState === WebSocket.OPEN) otherWs.send(JSON.stringify({ type: "call_ended" }));
        }
      }
    } catch {}
  });

  ws.on("close", () => {
    if (pingTimer) clearInterval(pingTimer);
    if (roomId && party) {
      const room = callRooms.get(roomId);
      if (room) {
        room[party] = null;
        const other = party === "rider" ? "driver" : "rider";
        const otherWs = room[other];
        if (otherWs?.readyState === WebSocket.OPEN) otherWs.send(JSON.stringify({ type: "peer_left" }));
        if (!room.rider && !room.driver) callRooms.delete(roomId);
      }
    }
  });

  ws.on("error", (err) => { logger.warn({ err }, "Call WS error"); });
});
// ─────────────────────────────────────────────────────────────────────────────

server.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});
