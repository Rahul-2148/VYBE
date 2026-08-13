// callProvider.js - Provider Abstractions for WebRTC Media Routing (Mesh & SFU)

export class CallTransportProvider {
  constructor(room, userId) {
    this.room = room;
    this.userId = userId;
    this.listeners = {};
  }

  join() {
    throw new Error("join() must be implemented");
  }

  leave() {
    throw new Error("leave() must be implemented");
  }

  publishTrack(track) {
    throw new Error("publishTrack() must be implemented");
  }

  unpublishTrack(track) {
    throw new Error("unpublishTrack() must be implemented");
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
  }

  emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach((cb) => cb(data));
  }
}

// 1. Mesh P2P Provider implementation (Full Mesh for small rooms / 1-to-1)
export class MeshCallProvider extends CallTransportProvider {
  constructor(room, userId, socket, iceServers) {
    super(room, userId);
    this.socket = socket;
    this.iceServers = iceServers;
    this.peerConnections = {};
  }

  join() {
    this.socket.emit("call:join-room", { room: this.room });
  }

  leave() {
    Object.keys(this.peerConnections).forEach((pid) => {
      this.peerConnections[pid].close();
    });
    this.peerConnections = {};
    this.socket.emit("call:leave-room", { room: this.room });
  }

  publishTrack(track, stream) {
    Object.keys(this.peerConnections).forEach((pid) => {
      const pc = this.peerConnections[pid];
      pc.addTrack(track, stream);
    });
  }

  unpublishTrack(track) {
    Object.keys(this.peerConnections).forEach((pid) => {
      const pc = this.peerConnections[pid];
      const sender = pc.getSenders().find((s) => s.track === track);
      if (sender) {
        pc.removeTrack(sender);
      }
    });
  }
}

// 2. SFU Provider Stub (Ready to bind LiveKit or mediasoup media routers)
export class SFUCallProvider extends CallTransportProvider {
  constructor(room, userId, options = {}) {
    super(room, userId);
    this.options = options;
    this.client = null; // LiveKit Room client or mediasoup device
  }

  async join() {
    console.log(`[SFU] Connecting participant ${this.userId} to room ${this.room} via SFU...`);
    // Example LiveKit implementation hook:
    // this.client = new Room();
    // await this.client.connect(this.options.url, this.options.token);
    this.emit("connected", { room: this.room });
  }

  leave() {
    console.log(`[SFU] Disconnecting from room ${this.room}`);
    if (this.client) {
      // this.client.disconnect();
    }
    this.emit("disconnected");
  }

  publishTrack(track) {
    console.log(`[SFU] Publishing track ${track.kind} to media SFU`);
  }

  unpublishTrack(track) {
    console.log(`[SFU] Unpublishing track ${track.kind} from media SFU`);
  }
}
