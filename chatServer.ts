import { WebSocketServer, WebSocket } from 'ws';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HISTORY_FILE = path.join(__dirname, 'chat_history.json');

export interface ChatMessage {
  id: string;
  channel: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userPoints: number;
  text: string;
  timestamp: string;
  repliedTo?: {
    id: string;
    userName: string;
    text: string;
  } | null;
  reactions?: Record<string, string[]>; // e.g., { "❤️": ["userId1", "userId2"] }
}

interface ActiveUser {
  userId: string;
  userName: string;
  userAvatar: string;
  userPoints: number;
  channel: string;
  typing: boolean;
  lastActive: number;
}

export class ChatServer {
  private wss: WebSocketServer | null = null;
  private messageHistory: Record<string, ChatMessage[]> = {
    general: [],
    bets: [],
    scores: [],
    support: [],
  };
  // Track connections mapped to active users
  private connections = new Map<WebSocket, ActiveUser>();

  constructor() {
    this.loadHistory();
  }

  // Bind to the HTTP Server
  public initialize(server: any) {
    this.wss = new WebSocketServer({ noServer: true });
    
    // Attach to HTTP server upgrades
    server.on('upgrade', (request: any, socket: any, head: any) => {
      const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
      if (pathname === '/api/chat') {
        this.wss?.handleUpgrade(request, socket, head, (ws) => {
          this.wss?.emit('connection', ws, request);
        });
      }
    });

    this.wss.on('connection', (ws: WebSocket) => {
      console.log('[CHAT SERVER] Client connected! Total:', this.connections.size + 1);

      // Set ping-pong connection checking to free resources of stale clients
      let isAlive = true;
      ws.on('pong', () => { isAlive = true; });

      const pingInterval = setInterval(() => {
        if (!isAlive) {
          console.log('[CHAT SERVER] Terminating inactive socket');
          clearInterval(pingInterval);
          ws.terminate();
          return;
        }
        isAlive = false;
        ws.ping();
      }, 30000);

      ws.on('message', (rawData: string) => {
        try {
          const payload = JSON.parse(rawData);
          this.handleEvent(ws, payload);
        } catch (err) {
          console.error('[CHAT SERVER] JSON Parse Error:', err);
        }
      });

      ws.on('close', () => {
        clearInterval(pingInterval);
        const user = this.connections.get(ws);
        if (user) {
          console.log(`[CHAT SERVER] Client disconnected: ${user.userName}`);
          this.connections.delete(ws);
          this.broadcastPresence();
        } else {
          console.log('[CHAT SERVER] Unregistered client disconnected');
        }
      });

      ws.on('error', (err) => {
        console.error('[CHAT SERVER] Socket error:', err);
      });
    });

    console.log('[CHAT SERVER] Real-time WhatsApp Chat Initialized on /api/chat');
  }

  // Load message history from JSON file
  private loadHistory() {
    try {
      if (fs.existsSync(HISTORY_FILE)) {
        const raw = fs.readFileSync(HISTORY_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          // Merge to ensure all preset keys are respected
          this.messageHistory = {
            general: Array.isArray(parsed.general) ? parsed.general : [],
            bets: Array.isArray(parsed.bets) ? parsed.bets : [],
            scores: Array.isArray(parsed.scores) ? parsed.scores : [],
            support: Array.isArray(parsed.support) ? parsed.support : [],
          };
          console.log('[CHAT SERVER] History loaded successfully. Total messages:', 
            Object.values(this.messageHistory).reduce((sum, list) => sum + list.length, 0));
        }
      } else {
        this.saveHistory();
      }
    } catch (err) {
      console.error('[CHAT SERVER] History loading error, starting fresh:', err);
    }
  }

  // Save message history to JSON file
  private saveHistory() {
    try {
      const data = JSON.stringify(this.messageHistory, null, 2);
      fs.writeFileSync(HISTORY_FILE, data, 'utf-8');
    } catch (err) {
      console.error('[CHAT SERVER] File saving error:', err);
    }
  }

  // Handle incoming commands
  private handleEvent(ws: WebSocket, payload: { type: string; payload: any }) {
    const { type, payload: args } = payload;

    switch (type) {
      case 'join': {
        const { userId, userName, userAvatar, userPoints, channel } = args;
        if (!userId || !userName) return;

        console.log(`[CHAT SERVER] User Joined: ${userName} to channel: ${channel}`);
        
        // Register user
        this.connections.set(ws, {
          userId,
          userName: userName || 'Anónimo',
          userAvatar: userAvatar || '',
          userPoints: userPoints || 0,
          channel: channel || 'general',
          typing: false,
          lastActive: Date.now(),
        });

        // Step 1: Send current channel history & active users immediately to the joining client
        this.sendToClient(ws, 'init', {
          history: this.messageHistory[channel || 'general'] || [],
          channel: channel || 'general'
        });

        // Step 2: Notify others about updated presence list
        this.broadcastPresence();
        break;
      }

      case 'channel_switch': {
        const user = this.connections.get(ws);
        if (!user) return;

        const oldChannel = user.channel;
        const newChannel = args.channel || 'general';
        user.channel = newChannel;
        user.typing = false;

        console.log(`[CHAT SERVER] User ${user.userName} switched from ${oldChannel} to ${newChannel}`);

        // Sync new history
        this.sendToClient(ws, 'init', {
          history: this.messageHistory[newChannel] || [],
          channel: newChannel
        });

        // Inform all other clients about presence recalculation
        this.broadcastPresence();
        break;
      }

      case 'message': {
        const user = this.connections.get(ws);
        if (!user) {
          this.sendToClient(ws, 'error', { message: 'Inicia sesión antes de chatear' });
          return;
        }

        const { text, repliedTo } = args;
        if (!text || text.trim() === '') return;

        const newMessage: ChatMessage = {
          id: Math.random().toString(36).substring(2, 15),
          channel: user.channel,
          userId: user.userId,
          userName: user.userName,
          userAvatar: user.userAvatar,
          userPoints: user.userPoints,
          text: text,
          timestamp: new Date().toISOString(),
          repliedTo: repliedTo || null,
          reactions: {},
        };

        const limit = 150; // Cap history per room
        const currentArr = this.messageHistory[user.channel] || [];
        currentArr.push(newMessage);
        if (currentArr.length > limit) {
          currentArr.shift();
        }
        this.messageHistory[user.channel] = currentArr;
        this.saveHistory();

        // Broadcast to all clients in same channel
        this.broadcastToChannel(user.channel, 'message', newMessage);

        // Reset user typing indicator on send
        if (user.typing) {
          user.typing = false;
          this.broadcastPresence();
        }
        break;
      }

      case 'typing': {
        const user = this.connections.get(ws);
        if (!user) return;

        const isTyping = !!args.typing;
        if (user.typing !== isTyping) {
          user.typing = isTyping;
          this.broadcastPresence();
        }
        break;
      }

      case 'reaction': {
        const user = this.connections.get(ws);
        if (!user) return;

        const { messageId, emoji } = args;
        if (!messageId || !emoji) return;

        // Try searching for the message in the current user's channel history
        const list = this.messageHistory[user.channel] || [];
        const msg = list.find((m) => m.id === messageId);
        if (msg) {
          if (!msg.reactions) msg.reactions = {};
          if (!msg.reactions[emoji]) msg.reactions[emoji] = [];

          const hadReactedIndex = msg.reactions[emoji].indexOf(user.userId);
          if (hadReactedIndex !== -1) {
            // Remove reaction
            msg.reactions[emoji].splice(hadReactedIndex, 1);
            if (msg.reactions[emoji].length === 0) {
              delete msg.reactions[emoji];
            }
          } else {
            // Add reaction
            msg.reactions[emoji].push(user.userId);
          }

          this.saveHistory();
          this.broadcastToChannel(user.channel, 'reaction_update', {
            messageId,
            reactions: msg.reactions,
          });
        }
        break;
      }

      case 'delete': {
        const user = this.connections.get(ws);
        if (!user) return;

        const { messageId } = args;
        if (!messageId) return;

        const list = this.messageHistory[user.channel] || [];
        const msgIndex = list.findIndex((m) => m.id === messageId);
        
        if (msgIndex !== -1) {
          const msg = list[msgIndex];
          // Users can only delete their own messages
          if (msg.userId === user.userId) {
            list.splice(msgIndex, 1);
            this.saveHistory();
            this.broadcastToChannel(user.channel, 'message_deleted', { messageId });
          }
        }
        break;
      }

      default:
        console.warn('[CHAT SERVER] Unknown event type:', type);
        break;
    }
  }

  // Send simple message to client
  private sendToClient(ws: WebSocket, type: string, payload: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, payload }));
    }
  }

  // Broadcast to all active sockets under a channel
  private broadcastToChannel(channel: string, type: string, payload: any) {
    const raw = JSON.stringify({ type, payload });
    this.connections.forEach((user, ws) => {
      if (user.channel === channel && ws.readyState === WebSocket.OPEN) {
        ws.send(raw);
      }
    });
  }

  // Send current active users present in each channel
  private broadcastPresence() {
    // Generate simplified lists per channel
    const usersPerChannel: Record<string, { userId: string; userName: string; userAvatar: string; typing: boolean }[]> = {
      general: [],
      bets: [],
      scores: [],
      support: [],
    };

    this.connections.forEach((user) => {
      if (!usersPerChannel[user.channel]) {
        usersPerChannel[user.channel] = [];
      }
      usersPerChannel[user.channel].push({
        userId: user.userId,
        userName: user.userName,
        userAvatar: user.userAvatar,
        typing: user.typing,
      });
    });

    // Send the correct list to each client based on their active channel
    this.connections.forEach((user, ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        this.sendToClient(ws, 'presence', {
          users: usersPerChannel[user.channel] || [],
          channel: user.channel,
        });
      }
    });
  }
}

// Global instance
export const chatServer = new ChatServer();
