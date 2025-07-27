// Socket.IO real-time communication module
export class Socket {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.eventHandlers = new Map();
  }

  connect(authToken) {
    try {
      // Only connect if Socket.IO is available
      if (typeof io === "undefined") {
        console.warn("Socket.IO not available, skipping real-time features");
        return;
      }

      this.socket = io({
        auth: { token: authToken },
        transports: ["websocket", "polling"],
      });

      this.setupEventListeners();
    } catch (error) {
      console.warn("Socket.IO connection failed:", error);
    }
  }

  setupEventListeners() {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      console.log("✅ Socket.IO connected");
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit("connected");
    });

    this.socket.on("disconnect", (reason) => {
      console.log("❌ Socket.IO disconnected:", reason);
      this.isConnected = false;
      this.emit("disconnected", reason);
    });

    this.socket.on("connect_error", (error) => {
      console.error("Socket.IO connection error:", error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.warn("Max reconnection attempts reached");
        this.emit("connection_failed");
      }
    });

    // Real-time event handlers
    this.socket.on("session_started", (data) => {
      this.emit("session_started", data);
    });

    this.socket.on("session_completed", (data) => {
      this.emit("session_completed", data);
    });

    this.socket.on("progress_updated", (data) => {
      this.emit("progress_updated", data);
    });

    this.socket.on("notification", (data) => {
      this.emit("notification", data);
    });
  }

  // Event emitter functionality
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  emit(event, data = null) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in socket event handler for ${event}:`, error);
        }
      });
    }
  }

  // Send events to server
  send(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`Cannot send ${event}: Socket not connected`);
    }
  }

  // Session events
  startSession(sessionData) {
    this.send("session_start", sessionData);
  }

  completeSession(sessionData) {
    this.send("session_complete", sessionData);
  }

  updateProgress(progressData) {
    this.send("progress_update", progressData);
  }

  // Disconnect
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Utility methods
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}
