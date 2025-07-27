# WebSocket & Real-time APIs for SDE2+ Engineers ⚡

## 🎯 **Overview**

Real-time communication is essential for modern applications. This comprehensive guide covers WebSocket implementation, Server-Sent Events (SSE), real-time chat systems, live notifications, and production-ready patterns for building scalable real-time applications.

## 📚 **Real-time Communication Technologies**

### **WebSocket vs SSE vs Long Polling**

| Feature                    | WebSocket                   | Server-Sent Events    | Long Polling     |
| -------------------------- | --------------------------- | --------------------- | ---------------- |
| **Bidirectional**          | ✅ Yes                      | ❌ No (server→client) | ✅ Yes           |
| **Protocol**               | ws:// / wss://              | HTTP/HTTPS            | HTTP/HTTPS       |
| **Browser Support**        | Universal                   | Modern browsers       | Universal        |
| **Automatic Reconnection** | Manual                      | Automatic             | Manual           |
| **Complexity**             | High                        | Low                   | Medium           |
| **Use Cases**              | Chat, gaming, collaboration | Notifications, feeds  | Simple real-time |

---

## 🔧 **WebSocket Implementation**

### **Complete Spring Boot WebSocket Server**

```java
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    @Autowired
    private ChatWebSocketHandler chatHandler;

    @Autowired
    private JwtTokenUtil jwtTokenUtil;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(chatHandler, "/ws/chat")
            .addInterceptors(new AuthenticationInterceptor(jwtTokenUtil))
            .setAllowedOrigins("*")
            .withSockJS();
    }
}

@Component
public class AuthenticationInterceptor implements HandshakeInterceptor {

    private final JwtTokenUtil jwtTokenUtil;

    public AuthenticationInterceptor(JwtTokenUtil jwtTokenUtil) {
        this.jwtTokenUtil = jwtTokenUtil;
    }

    @Override
    public boolean beforeHandshake(ServerHttpRequest request,
                                  ServerHttpResponse response,
                                  WebSocketHandler wsHandler,
                                  Map<String, Object> attributes) throws Exception {

        // Extract token from query parameter or header
        String token = extractToken(request);

        if (token != null && jwtTokenUtil.validateToken(token)) {
            String userId = jwtTokenUtil.getUserIdFromToken(token);
            attributes.put("userId", userId);
            attributes.put("token", token);
            return true;
        }

        return false; // Reject connection
    }

    @Override
    public void afterHandshake(ServerHttpRequest request,
                              ServerHttpResponse response,
                              WebSocketHandler wsHandler,
                              Exception exception) {
        // Post-handshake logic if needed
    }

    private String extractToken(ServerHttpRequest request) {
        // Try query parameter first
        List<String> tokenParams = request.getURI().getQuery() != null ?
            Arrays.stream(request.getURI().getQuery().split("&"))
                .filter(param -> param.startsWith("token="))
                .map(param -> param.substring(6))
                .collect(Collectors.toList()) : Collections.emptyList();

        if (!tokenParams.isEmpty()) {
            return tokenParams.get(0);
        }

        // Try Authorization header
        List<String> authHeaders = request.getHeaders().get("Authorization");
        if (authHeaders != null && !authHeaders.isEmpty()) {
            String authHeader = authHeaders.get(0);
            if (authHeader.startsWith("Bearer ")) {
                return authHeader.substring(7);
            }
        }

        return null;
    }
}

@Component
@Slf4j
public class ChatWebSocketHandler extends TextWebSocketHandler {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Map<String, WebSocketSession> userSessions = new ConcurrentHashMap<>();
    private final Map<String, Set<String>> roomParticipants = new ConcurrentHashMap<>();

    @Autowired
    private ChatService chatService;

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String userId = (String) session.getAttributes().get("userId");
        log.info("WebSocket connection established for user: {}", userId);

        // Store session
        userSessions.put(userId, session);

        // Update user online status
        updateUserOnlineStatus(userId, true);

        // Send connection confirmation
        sendToUser(userId, createMessage("SYSTEM", "CONNECTION_ESTABLISHED",
            Map.of("message", "Connected to chat server")));
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String userId = (String) session.getAttributes().get("userId");
        log.info("WebSocket connection closed for user: {}, status: {}", userId, status);

        // Remove session
        userSessions.remove(userId);

        // Remove from all rooms
        roomParticipants.values().forEach(participants -> participants.remove(userId));

        // Update user online status
        updateUserOnlineStatus(userId, false);

        // Notify rooms about user leaving
        notifyRoomsUserLeft(userId);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String userId = (String) session.getAttributes().get("userId");

        try {
            ChatMessage chatMessage = objectMapper.readValue(message.getPayload(), ChatMessage.class);
            chatMessage.setSenderId(userId);
            chatMessage.setTimestamp(Instant.now());

            handleChatMessage(chatMessage);

        } catch (Exception e) {
            log.error("Error processing message from user {}: {}", userId, e.getMessage());
            sendToUser(userId, createErrorMessage("Invalid message format"));
        }
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        String userId = (String) session.getAttributes().get("userId");
        log.error("WebSocket transport error for user {}: {}", userId, exception.getMessage());

        // Attempt to send error message before closing
        try {
            sendToUser(userId, createErrorMessage("Connection error occurred"));
        } catch (Exception e) {
            log.error("Failed to send error message to user {}", userId);
        }
    }

    private void handleChatMessage(ChatMessage message) throws Exception {
        switch (message.getType()) {
            case "JOIN_ROOM":
                handleJoinRoom(message);
                break;
            case "LEAVE_ROOM":
                handleLeaveRoom(message);
                break;
            case "CHAT_MESSAGE":
                handleChatMessageSend(message);
                break;
            case "TYPING":
                handleTypingIndicator(message);
                break;
            case "PRIVATE_MESSAGE":
                handlePrivateMessage(message);
                break;
            default:
                log.warn("Unknown message type: {}", message.getType());
        }
    }

    private void handleJoinRoom(ChatMessage message) throws Exception {
        String userId = message.getSenderId();
        String roomId = message.getRoomId();

        // Add user to room
        roomParticipants.computeIfAbsent(roomId, k -> ConcurrentHashMap.newKeySet()).add(userId);

        // Notify other participants
        broadcastToRoom(roomId, createMessage("SYSTEM", "USER_JOINED",
            Map.of("userId", userId, "roomId", roomId)), userId);

        // Send room participants to new user
        Set<String> participants = roomParticipants.get(roomId);
        sendToUser(userId, createMessage("SYSTEM", "ROOM_PARTICIPANTS",
            Map.of("roomId", roomId, "participants", participants)));

        log.info("User {} joined room {}", userId, roomId);
    }

    private void handleLeaveRoom(ChatMessage message) throws Exception {
        String userId = message.getSenderId();
        String roomId = message.getRoomId();

        // Remove user from room
        Set<String> participants = roomParticipants.get(roomId);
        if (participants != null) {
            participants.remove(userId);

            // Clean up empty rooms
            if (participants.isEmpty()) {
                roomParticipants.remove(roomId);
            }
        }

        // Notify other participants
        broadcastToRoom(roomId, createMessage("SYSTEM", "USER_LEFT",
            Map.of("userId", userId, "roomId", roomId)), userId);

        log.info("User {} left room {}", userId, roomId);
    }

    private void handleChatMessageSend(ChatMessage message) throws Exception {
        String userId = message.getSenderId();
        String roomId = message.getRoomId();

        // Validate user is in room
        Set<String> participants = roomParticipants.get(roomId);
        if (participants == null || !participants.contains(userId)) {
            sendToUser(userId, createErrorMessage("You are not a member of this room"));
            return;
        }

        // Save message to database
        ChatMessage savedMessage = chatService.saveMessage(message);

        // Broadcast to all room participants
        broadcastToRoom(roomId, createMessage("CHAT", "MESSAGE",
            Map.of(
                "messageId", savedMessage.getId(),
                "senderId", savedMessage.getSenderId(),
                "content", savedMessage.getContent(),
                "timestamp", savedMessage.getTimestamp(),
                "roomId", roomId
            )), null);

        log.info("Message sent in room {} by user {}", roomId, userId);
    }

    private void handleTypingIndicator(ChatMessage message) throws Exception {
        String userId = message.getSenderId();
        String roomId = message.getRoomId();

        // Broadcast typing indicator to room (except sender)
        broadcastToRoom(roomId, createMessage("TYPING", "INDICATOR",
            Map.of(
                "userId", userId,
                "isTyping", message.getData().get("isTyping"),
                "roomId", roomId
            )), userId);
    }

    private void handlePrivateMessage(ChatMessage message) throws Exception {
        String senderId = message.getSenderId();
        String recipientId = (String) message.getData().get("recipientId");

        // Save private message
        ChatMessage savedMessage = chatService.savePrivateMessage(message);

        // Send to recipient
        sendToUser(recipientId, createMessage("PRIVATE", "MESSAGE",
            Map.of(
                "messageId", savedMessage.getId(),
                "senderId", senderId,
                "content", savedMessage.getContent(),
                "timestamp", savedMessage.getTimestamp()
            )));

        // Send delivery confirmation to sender
        sendToUser(senderId, createMessage("PRIVATE", "DELIVERED",
            Map.of("messageId", savedMessage.getId())));
    }

    private void broadcastToRoom(String roomId, Map<String, Object> message, String excludeUserId) {
        Set<String> participants = roomParticipants.get(roomId);
        if (participants != null) {
            participants.stream()
                .filter(userId -> !userId.equals(excludeUserId))
                .forEach(userId -> {
                    try {
                        sendToUser(userId, message);
                    } catch (Exception e) {
                        log.error("Failed to send message to user {}: {}", userId, e.getMessage());
                    }
                });
        }
    }

    private void sendToUser(String userId, Map<String, Object> message) throws Exception {
        WebSocketSession session = userSessions.get(userId);
        if (session != null && session.isOpen()) {
            String messageJson = objectMapper.writeValueAsString(message);
            session.sendMessage(new TextMessage(messageJson));
        }
    }

    private Map<String, Object> createMessage(String category, String type, Map<String, Object> data) {
        return Map.of(
            "category", category,
            "type", type,
            "data", data,
            "timestamp", Instant.now()
        );
    }

    private Map<String, Object> createErrorMessage(String error) {
        return createMessage("ERROR", "MESSAGE", Map.of("error", error));
    }

    private void updateUserOnlineStatus(String userId, boolean isOnline) {
        // Update in Redis for distributed systems
        String key = "user:online:" + userId;
        if (isOnline) {
            redisTemplate.opsForValue().set(key, "true", Duration.ofMinutes(5));
        } else {
            redisTemplate.delete(key);
        }
    }

    private void notifyRoomsUserLeft(String userId) {
        // Notify all rooms where user was present
        roomParticipants.entrySet().stream()
            .filter(entry -> entry.getValue().contains(userId))
            .forEach(entry -> {
                String roomId = entry.getKey();
                try {
                    broadcastToRoom(roomId, createMessage("SYSTEM", "USER_DISCONNECTED",
                        Map.of("userId", userId, "roomId", roomId)), userId);
                } catch (Exception e) {
                    log.error("Failed to notify room {} about user {} leaving", roomId, userId);
                }
            });
    }
}

// Message models
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessage {
    private String id;
    private String type;
    private String senderId;
    private String roomId;
    private String content;
    private Map<String, Object> data;
    private Instant timestamp;
}
```

### **Frontend WebSocket Client - JavaScript/React**

```javascript
// WebSocket client implementation
class ChatWebSocketClient {
  constructor(serverUrl, token) {
    this.serverUrl = serverUrl;
    this.token = token;
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.messageQueue = [];
    this.eventListeners = new Map();
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `${this.serverUrl}/ws/chat?token=${this.token}`;
        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = (event) => {
          console.log("WebSocket connected");
          this.isConnected = true;
          this.reconnectAttempts = 0;

          // Send queued messages
          this.flushMessageQueue();

          this.emit("connected", event);
          resolve(event);
        };

        this.socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error("Error parsing message:", error);
          }
        };

        this.socket.onclose = (event) => {
          console.log("WebSocket disconnected:", event.code, event.reason);
          this.isConnected = false;
          this.emit("disconnected", event);

          // Attempt reconnection if not manually closed
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect();
          }
        };

        this.socket.onerror = (error) => {
          console.error("WebSocket error:", error);
          this.emit("error", error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.close(1000, "Client disconnecting");
      this.socket = null;
      this.isConnected = false;
    }
  }

  send(message) {
    if (this.isConnected && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      // Queue message for later sending
      this.messageQueue.push(message);
    }
  }

  // Chat-specific methods
  joinRoom(roomId) {
    this.send({
      type: "JOIN_ROOM",
      roomId: roomId,
      timestamp: new Date().toISOString(),
    });
  }

  leaveRoom(roomId) {
    this.send({
      type: "LEAVE_ROOM",
      roomId: roomId,
      timestamp: new Date().toISOString(),
    });
  }

  sendChatMessage(roomId, content) {
    this.send({
      type: "CHAT_MESSAGE",
      roomId: roomId,
      content: content,
      timestamp: new Date().toISOString(),
    });
  }

  sendTypingIndicator(roomId, isTyping) {
    this.send({
      type: "TYPING",
      roomId: roomId,
      data: { isTyping },
      timestamp: new Date().toISOString(),
    });
  }

  sendPrivateMessage(recipientId, content) {
    this.send({
      type: "PRIVATE_MESSAGE",
      content: content,
      data: { recipientId },
      timestamp: new Date().toISOString(),
    });
  }

  // Event handling
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  handleMessage(message) {
    const { category, type, data } = message;

    switch (category) {
      case "SYSTEM":
        this.handleSystemMessage(type, data);
        break;
      case "CHAT":
        this.handleChatMessage(type, data);
        break;
      case "TYPING":
        this.handleTypingMessage(type, data);
        break;
      case "PRIVATE":
        this.handlePrivateMessage(type, data);
        break;
      case "ERROR":
        this.handleErrorMessage(type, data);
        break;
      default:
        console.warn("Unknown message category:", category);
    }
  }

  handleSystemMessage(type, data) {
    switch (type) {
      case "CONNECTION_ESTABLISHED":
        this.emit("connectionEstablished", data);
        break;
      case "USER_JOINED":
        this.emit("userJoined", data);
        break;
      case "USER_LEFT":
        this.emit("userLeft", data);
        break;
      case "ROOM_PARTICIPANTS":
        this.emit("roomParticipants", data);
        break;
      default:
        this.emit("systemMessage", { type, data });
    }
  }

  handleChatMessage(type, data) {
    if (type === "MESSAGE") {
      this.emit("chatMessage", data);
    }
  }

  handleTypingMessage(type, data) {
    if (type === "INDICATOR") {
      this.emit("typingIndicator", data);
    }
  }

  handlePrivateMessage(type, data) {
    switch (type) {
      case "MESSAGE":
        this.emit("privateMessage", data);
        break;
      case "DELIVERED":
        this.emit("messageDelivered", data);
        break;
    }
  }

  handleErrorMessage(type, data) {
    this.emit("error", data);
  }

  attemptReconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

    setTimeout(() => {
      this.connect().catch((error) => {
        console.error("Reconnection failed:", error);
      });
    }, delay);
  }

  flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }

  getConnectionState() {
    return {
      isConnected: this.isConnected,
      readyState: this.socket?.readyState,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
    };
  }
}

// React Hook for WebSocket Chat
import { useState, useEffect, useRef, useCallback } from "react";

export const useChatWebSocket = (serverUrl, token) => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [roomParticipants, setRoomParticipants] = useState([]);
  const [error, setError] = useState(null);

  const clientRef = useRef(null);
  const currentRoomRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    const client = new ChatWebSocketClient(serverUrl, token);
    clientRef.current = client;

    // Set up event listeners
    client.on("connected", () => {
      setIsConnected(true);
      setError(null);
    });

    client.on("disconnected", () => {
      setIsConnected(false);
    });

    client.on("error", (error) => {
      setError(error.error || "WebSocket error occurred");
    });

    client.on("chatMessage", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    client.on("typingIndicator", ({ userId, isTyping, roomId }) => {
      if (roomId === currentRoomRef.current) {
        setTypingUsers((prev) => {
          const newSet = new Set(prev);
          if (isTyping) {
            newSet.add(userId);
          } else {
            newSet.delete(userId);
          }
          return newSet;
        });
      }
    });

    client.on("roomParticipants", ({ participants }) => {
      setRoomParticipants(participants);
    });

    client.on("userJoined", ({ userId }) => {
      setRoomParticipants((prev) => [...prev, userId]);
    });

    client.on("userLeft", ({ userId }) => {
      setRoomParticipants((prev) => prev.filter((id) => id !== userId));
    });

    // Connect
    client.connect().catch((error) => {
      setError("Failed to connect to chat server");
    });

    return () => {
      client.disconnect();
    };
  }, [serverUrl, token]);

  const joinRoom = useCallback((roomId) => {
    if (clientRef.current) {
      currentRoomRef.current = roomId;
      setMessages([]); // Clear previous messages
      setTypingUsers(new Set());
      clientRef.current.joinRoom(roomId);
    }
  }, []);

  const leaveRoom = useCallback(() => {
    if (clientRef.current && currentRoomRef.current) {
      clientRef.current.leaveRoom(currentRoomRef.current);
      currentRoomRef.current = null;
      setMessages([]);
      setTypingUsers(new Set());
      setRoomParticipants([]);
    }
  }, []);

  const sendMessage = useCallback((content) => {
    if (clientRef.current && currentRoomRef.current) {
      clientRef.current.sendChatMessage(currentRoomRef.current, content);
    }
  }, []);

  const sendTypingIndicator = useCallback((isTyping) => {
    if (clientRef.current && currentRoomRef.current) {
      clientRef.current.sendTypingIndicator(currentRoomRef.current, isTyping);
    }
  }, []);

  return {
    isConnected,
    messages,
    typingUsers: Array.from(typingUsers),
    roomParticipants,
    error,
    joinRoom,
    leaveRoom,
    sendMessage,
    sendTypingIndicator,
  };
};

// Chat Component Example
const ChatRoom = ({ roomId, token }) => {
  const { isConnected, messages, typingUsers, roomParticipants, error, joinRoom, leaveRoom, sendMessage, sendTypingIndicator } = useChatWebSocket("ws://localhost:8080", token);

  const [messageInput, setMessageInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (roomId) {
      joinRoom(roomId);
    }

    return () => {
      leaveRoom();
    };
  }, [roomId, joinRoom, leaveRoom]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (messageInput.trim()) {
      sendMessage(messageInput.trim());
      setMessageInput("");
      handleStopTyping();
    }
  };

  const handleInputChange = (e) => {
    setMessageInput(e.target.value);

    if (!isTyping) {
      setIsTyping(true);
      sendTypingIndicator(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 2000);
  };

  const handleStopTyping = () => {
    if (isTyping) {
      setIsTyping(false);
      sendTypingIndicator(false);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="chat-room">
      <div className="chat-header">
        <h3>Room: {roomId}</h3>
        <div className="connection-status">{isConnected ? <span className="connected">🟢 Connected</span> : <span className="disconnected">🔴 Disconnected</span>}</div>
        <div className="participants">Participants: {roomParticipants.length}</div>
      </div>

      <div className="messages-container">
        {messages.map((message, index) => (
          <div key={index} className="message">
            <span className="sender">{message.senderId}:</span>
            <span className="content">{message.content}</span>
            <span className="timestamp">{new Date(message.timestamp).toLocaleTimeString()}</span>
          </div>
        ))}

        {typingUsers.length > 0 && (
          <div className="typing-indicator">
            {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="message-form">
        <input type="text" value={messageInput} onChange={handleInputChange} placeholder="Type a message..." disabled={!isConnected} />
        <button type="submit" disabled={!isConnected || !messageInput.trim()}>
          Send
        </button>
      </form>
    </div>
  );
};
```

---

## 📡 **Server-Sent Events (SSE) Implementation**

### **Spring Boot SSE Controller**

```java
@RestController
@RequestMapping("/api/v1/notifications")
@CrossOrigin(origins = "*")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    private final Map<String, SseEmitter> userEmitters = new ConcurrentHashMap<>();

    @GetMapping(value = "/stream/{userId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamNotifications(@PathVariable String userId,
                                        @RequestHeader(value = "Last-Event-ID", required = false) String lastEventId) {

        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
        userEmitters.put(userId, emitter);

        // Configure emitter callbacks
        emitter.onCompletion(() -> {
            userEmitters.remove(userId);
            log.info("SSE connection completed for user: {}", userId);
        });

        emitter.onTimeout(() -> {
            userEmitters.remove(userId);
            log.info("SSE connection timed out for user: {}", userId);
        });

        emitter.onError((ex) -> {
            userEmitters.remove(userId);
            log.error("SSE connection error for user {}: {}", userId, ex.getMessage());
        });

        // Send initial connection event
        try {
            emitter.send(SseEmitter.event()
                .name("connected")
                .data("Connected to notification stream")
                .id(String.valueOf(System.currentTimeMillis())));

            // Send missed notifications if lastEventId is provided
            if (lastEventId != null) {
                sendMissedNotifications(emitter, userId, lastEventId);
            }

        } catch (IOException e) {
            log.error("Error sending initial SSE event to user {}: {}", userId, e.getMessage());
            emitter.completeWithError(e);
        }

        return emitter;
    }

    @PostMapping("/send")
    public ResponseEntity<String> sendNotification(@RequestBody NotificationRequest request) {
        try {
            // Save notification
            Notification notification = notificationService.createNotification(request);

            // Send via SSE
            sendNotificationToUser(request.getUserId(), notification);

            return ResponseEntity.ok("Notification sent successfully");

        } catch (Exception e) {
            log.error("Error sending notification: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Failed to send notification");
        }
    }

    @PostMapping("/broadcast")
    public ResponseEntity<String> broadcastNotification(@RequestBody BroadcastRequest request) {
        try {
            // Send to all connected users
            userEmitters.entrySet().parallelStream().forEach(entry -> {
                String userId = entry.getKey();
                SseEmitter emitter = entry.getValue();

                try {
                    emitter.send(SseEmitter.event()
                        .name("broadcast")
                        .data(request.getMessage())
                        .id(String.valueOf(System.currentTimeMillis())));

                } catch (IOException e) {
                    log.error("Failed to send broadcast to user {}: {}", userId, e.getMessage());
                    userEmitters.remove(userId);
                }
            });

            return ResponseEntity.ok("Broadcast sent to " + userEmitters.size() + " users");

        } catch (Exception e) {
            log.error("Error broadcasting notification: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Failed to broadcast notification");
        }
    }

    private void sendNotificationToUser(String userId, Notification notification) {
        SseEmitter emitter = userEmitters.get(userId);

        if (emitter != null) {
            try {
                emitter.send(SseEmitter.event()
                    .name("notification")
                    .data(notification)
                    .id(notification.getId()));

            } catch (IOException e) {
                log.error("Failed to send notification to user {}: {}", userId, e.getMessage());
                userEmitters.remove(userId);
            }
        } else {
            // Store for later delivery
            storeOfflineNotification(userId, notification);
        }
    }

    private void sendMissedNotifications(SseEmitter emitter, String userId, String lastEventId) {
        try {
            List<Notification> missedNotifications = notificationService
                .getNotificationsAfterEventId(userId, lastEventId);

            for (Notification notification : missedNotifications) {
                emitter.send(SseEmitter.event()
                    .name("notification")
                    .data(notification)
                    .id(notification.getId()));
            }

        } catch (Exception e) {
            log.error("Error sending missed notifications to user {}: {}", userId, e.getMessage());
        }
    }

    private void storeOfflineNotification(String userId, Notification notification) {
        // Store in Redis for offline users
        String key = "offline_notifications:" + userId;
        redisTemplate.opsForList().rightPush(key, notification);
        redisTemplate.expire(key, Duration.ofDays(7)); // Keep for 7 days
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getConnectionStatus() {
        return ResponseEntity.ok(Map.of(
            "connectedUsers", userEmitters.size(),
            "users", userEmitters.keySet()
        ));
    }
}

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationRequest {
    private String userId;
    private String title;
    private String message;
    private String type;
    private Map<String, Object> data;
}

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BroadcastRequest {
    private String title;
    private String message;
    private String type;
}

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Notification {
    private String id;
    private String userId;
    private String title;
    private String message;
    private String type;
    private Map<String, Object> data;
    private boolean read;
    private Instant createdAt;
}
```

### **Frontend SSE Client**

```javascript
// Server-Sent Events client
class NotificationSSEClient {
  constructor(baseUrl, userId, token) {
    this.baseUrl = baseUrl;
    this.userId = userId;
    this.token = token;
    this.eventSource = null;
    this.lastEventId = localStorage.getItem(`lastEventId_${userId}`);
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.eventListeners = new Map();
  }

  connect() {
    try {
      let url = `${this.baseUrl}/api/v1/notifications/stream/${this.userId}`;

      // Add last event ID for missed notifications
      if (this.lastEventId) {
        url += `?lastEventId=${this.lastEventId}`;
      }

      this.eventSource = new EventSource(url);

      this.eventSource.onopen = (event) => {
        console.log("SSE connection opened");
        this.reconnectAttempts = 0;
        this.emit("connected", event);
      };

      this.eventSource.onmessage = (event) => {
        this.handleMessage(event);
      };

      this.eventSource.onerror = (event) => {
        console.error("SSE connection error:", event);

        if (this.eventSource.readyState === EventSource.CLOSED) {
          this.emit("disconnected", event);
          this.attemptReconnect();
        } else {
          this.emit("error", event);
        }
      };

      // Listen for specific event types
      this.eventSource.addEventListener("notification", (event) => {
        this.handleNotification(event);
      });

      this.eventSource.addEventListener("broadcast", (event) => {
        this.handleBroadcast(event);
      });

      this.eventSource.addEventListener("connected", (event) => {
        console.log("Connected to notification stream:", event.data);
      });
    } catch (error) {
      console.error("Failed to create SSE connection:", error);
      this.emit("error", error);
    }
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  handleMessage(event) {
    // Store last event ID
    if (event.lastEventId) {
      this.lastEventId = event.lastEventId;
      localStorage.setItem(`lastEventId_${this.userId}`, this.lastEventId);
    }

    this.emit("message", {
      data: event.data,
      lastEventId: event.lastEventId,
      type: event.type,
    });
  }

  handleNotification(event) {
    try {
      const notification = JSON.parse(event.data);

      // Store last event ID
      if (event.lastEventId) {
        this.lastEventId = event.lastEventId;
        localStorage.setItem(`lastEventId_${this.userId}`, this.lastEventId);
      }

      this.emit("notification", notification);

      // Show browser notification if permissions granted
      this.showBrowserNotification(notification);
    } catch (error) {
      console.error("Error parsing notification:", error);
    }
  }

  handleBroadcast(event) {
    try {
      const broadcast = JSON.parse(event.data);
      this.emit("broadcast", broadcast);
    } catch (error) {
      console.error("Error parsing broadcast:", error);
    }
  }

  showBrowserNotification(notification) {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(notification.title, {
        body: notification.message,
        icon: "/notification-icon.png",
        tag: notification.id,
        requireInteraction: false,
      });
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

      console.log(`Attempting SSE reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error("Max SSE reconnection attempts reached");
      this.emit("maxReconnectAttemptsReached");
    }
  }

  // Event handling methods
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in SSE event listener for ${event}:`, error);
        }
      });
    }
  }

  getConnectionState() {
    return {
      readyState: this.eventSource?.readyState,
      url: this.eventSource?.url,
      reconnectAttempts: this.reconnectAttempts,
      lastEventId: this.lastEventId,
    };
  }
}

// React Hook for SSE Notifications
import { useState, useEffect, useRef } from "react";

export const useNotificationSSE = (baseUrl, userId, token) => {
  const [notifications, setNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  const clientRef = useRef(null);

  useEffect(() => {
    if (!userId || !token) return;

    const client = new NotificationSSEClient(baseUrl, userId, token);
    clientRef.current = client;

    // Set up event listeners
    client.on("connected", () => {
      setIsConnected(true);
      setError(null);
    });

    client.on("disconnected", () => {
      setIsConnected(false);
    });

    client.on("error", (error) => {
      setError("Failed to connect to notification service");
      setIsConnected(false);
    });

    client.on("notification", (notification) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 100)); // Keep last 100
    });

    client.on("broadcast", (broadcast) => {
      // Handle broadcast messages
      console.log("Broadcast received:", broadcast);
    });

    client.on("maxReconnectAttemptsReached", () => {
      setError("Connection lost. Please refresh the page.");
    });

    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    // Connect
    client.connect();

    return () => {
      client.disconnect();
    };
  }, [baseUrl, userId, token]);

  const markAsRead = (notificationId) => {
    setNotifications((prev) => prev.map((notification) => (notification.id === notificationId ? { ...notification, read: true } : notification)));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    isConnected,
    error,
    markAsRead,
    clearNotifications,
  };
};

// Notification Component
const NotificationCenter = ({ userId, token }) => {
  const { notifications, unreadCount, isConnected, error, markAsRead, clearNotifications } = useNotificationSSE("http://localhost:8080", userId, token);

  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="notification-center">
      <button className="notification-button" onClick={() => setIsOpen(!isOpen)}>
        🔔
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            <div className="connection-status">{isConnected ? <span className="connected">🟢</span> : <span className="disconnected">🔴</span>}</div>
          </div>

          {error && <div className="notification-error">{error}</div>}

          <div className="notification-actions">
            <button onClick={clearNotifications}>Clear All</button>
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">No notifications</div>
            ) : (
              notifications.map((notification) => (
                <div key={notification.id} className={`notification-item ${notification.read ? "read" : "unread"}`} onClick={() => markAsRead(notification.id)}>
                  <div className="notification-title">{notification.title}</div>
                  <div className="notification-message">{notification.message}</div>
                  <div className="notification-time">{new Date(notification.createdAt).toLocaleTimeString()}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
```

---

## 🎯 **Production Considerations**

### **Scaling WebSocket Connections**

```java
@Configuration
@EnableRedisWebSocketMessageBroker
public class ScalableWebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable simple broker for /topic and /queue
        config.enableStompBrokerRelay("/topic", "/queue")
            .setRelayHost("localhost")
            .setRelayPort(61613)
            .setClientLogin("guest")
            .setClientPasscode("guest");

        // Set application destination prefix
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
            .setAllowedOriginPatterns("*")
            .withSockJS();
    }
}

// Redis-based session management for scaling
@Service
public class WebSocketSessionManager {

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    private static final String SESSION_KEY_PREFIX = "websocket:session:";
    private static final String USER_SESSIONS_KEY_PREFIX = "websocket:user:";

    public void registerSession(String sessionId, String userId, String serverId) {
        // Store session info
        Map<String, Object> sessionInfo = Map.of(
            "userId", userId,
            "serverId", serverId,
            "connectedAt", Instant.now()
        );

        redisTemplate.opsForHash().putAll(SESSION_KEY_PREFIX + sessionId, sessionInfo);
        redisTemplate.expire(SESSION_KEY_PREFIX + sessionId, Duration.ofHours(24));

        // Add to user's session list
        redisTemplate.opsForSet().add(USER_SESSIONS_KEY_PREFIX + userId, sessionId);
        redisTemplate.expire(USER_SESSIONS_KEY_PREFIX + userId, Duration.ofHours(24));
    }

    public void unregisterSession(String sessionId, String userId) {
        redisTemplate.delete(SESSION_KEY_PREFIX + sessionId);
        redisTemplate.opsForSet().remove(USER_SESSIONS_KEY_PREFIX + userId, sessionId);
    }

    public Set<String> getUserSessions(String userId) {
        return redisTemplate.opsForSet().members(USER_SESSIONS_KEY_PREFIX + userId);
    }

    public List<String> getActiveServers() {
        // Get all unique server IDs from active sessions
        Set<String> servers = new HashSet<>();

        Set<String> sessionKeys = redisTemplate.keys(SESSION_KEY_PREFIX + "*");
        for (String sessionKey : sessionKeys) {
            String serverId = (String) redisTemplate.opsForHash().get(sessionKey, "serverId");
            if (serverId != null) {
                servers.add(serverId);
            }
        }

        return new ArrayList<>(servers);
    }
}
```

### **Load Balancing and High Availability**

```yaml
# nginx.conf for WebSocket load balancing
upstream websocket_backend {
    ip_hash; # Sticky sessions for WebSocket
    server backend1:8080;
    server backend2:8080;
    server backend3:8080;
}

server {
    listen 80;
    server_name your-domain.com;

    location /ws/ {
        proxy_pass http://websocket_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### **Monitoring and Metrics**

```java
@Component
public class WebSocketMetrics {

    private final MeterRegistry meterRegistry;
    private final AtomicInteger activeConnections = new AtomicInteger(0);

    public WebSocketMetrics(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;

        // Register gauges
        Gauge.builder("websocket.connections.active")
            .register(meterRegistry, activeConnections);
    }

    public void incrementConnections() {
        activeConnections.incrementAndGet();
        meterRegistry.counter("websocket.connections.opened").increment();
    }

    public void decrementConnections() {
        activeConnections.decrementAndGet();
        meterRegistry.counter("websocket.connections.closed").increment();
    }

    public void recordMessageSent(String messageType) {
        meterRegistry.counter("websocket.messages.sent", "type", messageType).increment();
    }

    public void recordMessageReceived(String messageType) {
        meterRegistry.counter("websocket.messages.received", "type", messageType).increment();
    }

    public void recordError(String errorType) {
        meterRegistry.counter("websocket.errors", "type", errorType).increment();
    }
}
```

---

## 🎯 **Best Practices Summary**

### **✅ Real-time API Checklist**

#### **WebSocket Implementation**

- ✅ **Authentication** - Secure WebSocket connections
- ✅ **Reconnection Logic** - Automatic reconnection with exponential backoff
- ✅ **Message Queuing** - Queue messages during disconnections
- ✅ **Error Handling** - Graceful error handling and recovery
- ✅ **Heartbeat/Ping** - Keep connections alive

#### **Server-Sent Events**

- ✅ **Event ID Tracking** - Support for missed event recovery
- ✅ **Automatic Reconnection** - Browser handles reconnection
- ✅ **CORS Support** - Cross-origin event streams
- ✅ **Connection Management** - Proper cleanup on disconnect
- ✅ **Fallback Strategy** - Long polling fallback

#### **Production Readiness**

- ✅ **Load Balancing** - Sticky sessions for WebSocket
- ✅ **Scaling Strategy** - Redis-based session management
- ✅ **Monitoring** - Connection and message metrics
- ✅ **Security** - Rate limiting and DDoS protection
- ✅ **Performance** - Connection limits and resource management

---

## 🚀 **Next Steps**

1. **Choose appropriate technology** (WebSocket vs SSE vs Long Polling)
2. **Implement authentication** and authorization
3. **Set up proper error handling** and reconnection logic
4. **Add monitoring and metrics** for production
5. **Test at scale** with load testing tools
6. **Deploy with load balancing** and high availability

_Real-time communication enhances user experience significantly. Master these patterns to build responsive, engaging applications!_
