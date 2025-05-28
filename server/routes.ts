import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { loginSchema, insertGroupMessageSchema, insertDirectMessageSchema, type ClientUser, type DirectMessage, type DirectMessageDrizzle, type GroupMessage, type GroupMessageDrizzle } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";

// Allowed users configuration
const ALLOWED_USERS: Record<string, { password_plaintext: string; isAdmin: boolean }> = {
  'adu': { password_plaintext: '1995', isAdmin: true },
  'fana': { password_plaintext: '2025', isAdmin: false },
  'mearg': { password_plaintext: '2025', isAdmin: false },
  'miki': { password_plaintext: '2025', isAdmin: false },
  'betty': { password_plaintext: '2025', isAdmin: false },
  'teme': { password_plaintext: '2025', isAdmin: false },
};

// Helper to convert Drizzle message to Zod message (Date to ISO string)
function toZodMessage<T extends GroupMessageDrizzle | DirectMessageDrizzle>(
  message: T
): T extends GroupMessageDrizzle ? GroupMessage : DirectMessage {
  const messageAsAny = message as any; // Allow access to properties for transformation
  return {
    ...messageAsAny,
    timestamp: messageAsAny.timestamp.toISOString(),
    updatedAt: messageAsAny.updatedAt.toISOString(),
  } as T extends GroupMessageDrizzle ? GroupMessage : DirectMessage;
}

// File upload setup
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

interface AuthenticatedRequest extends Request {
  user?: { username: string; isAdmin: boolean };
}

// WebSocket connection management
const wsConnections = new Map<string, WebSocket[]>();

function broadcastToAllUsers(message: any, exclude?: string) {
  const messageStr = JSON.stringify(message);
  wsConnections.forEach((connections, username) => {
    if (username !== exclude) {
      connections.forEach((ws: WebSocket) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(messageStr);
        }
      });
    }
  });
}

function sendToUser(username: string, message: any) {
  const connections = wsConnections.get(username) || [];
  const messageStr = JSON.stringify(message);
  connections.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(messageStr);
    }
  });
}

// Authentication middleware
async function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header required' });
  }

  const token = authHeader.substring(7);
  try {
    const decoded = Buffer.from(token, 'base64').toString();
    const [usernameFromToken] = decoded.split(':'); // We don't necessarily need the password from token here
    
    const user = await storage.getUserByUsername(usernameFromToken);
    if (!user) {
      return res.status(401).json({ message: 'Invalid user from token' });
    }

    // Check if user is in ALLOWED_USERS (extra check, though token implies they were allowed at login)
    // This might be redundant if token lifecycle is short and validated against current rules.
    // const allowedUserInfo = ALLOWED_USERS[user.username.toLowerCase()];
    // if (!allowedUserInfo) {
    //   return res.status(403).json({ message: 'User no longer allowed' });
    // }

    req.user = { username: user.username, isAdmin: user.isAdmin };
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Login endpoint
  app.post('/api/login', async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      const lowerCaseUsername = username.toLowerCase();

      const allowedUserInfo = ALLOWED_USERS[lowerCaseUsername];

      if (allowedUserInfo && allowedUserInfo.password_plaintext === password) {
        const isAdmin = allowedUserInfo.isAdmin;
        
        let user = await storage.getUserByUsername(username); 
        if (!user) {
          user = await storage.createUser({
            username: username, 
            password: password, // Store plaintext password - THIS IS INSECURE FOR PRODUCTION
            isAdmin,
          });
        } else {
          // If user exists, ensure their isAdmin status matches the allow list.
          // This would typically involve an updateUser method if you want this to be dynamic.
          if (user.isAdmin !== isAdmin) {
            console.warn(
              `User '${username}' isAdmin status in DB (${user.isAdmin}) ` +
              `differs from ALLOWED_USERS list (${isAdmin}). ` +
              `Consider an update mechanism or ensure DB is the source of truth after initial creation.`
            );
            // For now, we will use the isAdmin status from the ALLOWED_USERS list for the session token,
            // but the DB record might retain its original isAdmin status unless explicitly updated.
          }
        }

        await storage.updateUserOnlineStatus(username, true);
        const token = Buffer.from(`${username}:${password}`).toString('base64');
        
        const dbUser = await storage.getUserByUsername(username);
        if (!dbUser) { 
            return res.status(500).json({ message: 'Failed to retrieve user data after login processing.'});
        }
        
        // Prepare user object for client, omitting password and ensuring ISO dates
        const clientSafeUser: ClientUser = {
            id: dbUser.id,
            username: dbUser.username,
            isAdmin: dbUser.isAdmin, 
            isOnline: dbUser.isOnline,
            lastSeen: dbUser.lastSeen?.toISOString() || null,
            createdAt: dbUser.createdAt?.toISOString() || undefined, // Match ClientUser type
            socketId: undefined // Not typically sent on login response for general user object
        };

        res.json({
          token,
          user: clientSafeUser, // Use the client-safe user object
        });
      } else {
        res.status(401).json({ message: 'Invalid or not allowed username/password' });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: 'An internal server error occurred' });
    }
  });

  // Logout endpoint
  app.post('/api/logout', authenticateUser, async (req: AuthenticatedRequest, res) => {
    if (req.user) {
      await storage.updateUserOnlineStatus(req.user.username, false);
      
      // Remove WebSocket connections
      wsConnections.delete(req.user.username);
      
      // Broadcast user offline
      broadcastToAllUsers({
        type: 'user_offline',
        username: req.user.username,
      });
    }
    res.json({ message: 'Logged out successfully' });
  });

  // Get current user
  app.get('/api/user', authenticateUser, async (req: AuthenticatedRequest, res) => {
    if (req.user) {
      const user = await storage.getUserByUsername(req.user.username);
      res.json(user);
    } else {
      res.status(401).json({ message: 'Not authenticated' });
    }
  });

  // Get online users
  app.get('/api/users/online', authenticateUser, async (req, res) => {
    const usersDrizzle = await storage.getAllOnlineUsers();
    const clientUsers: ClientUser[] = usersDrizzle.map(u => ({
      id: u.id,
      username: u.username,
      isAdmin: u.isAdmin,
      isOnline: u.isOnline,
      lastSeen: u.lastSeen?.toISOString() || null,
      createdAt: u.createdAt?.toISOString() || undefined,
      socketId: undefined, // socketId is not typically sent in user lists
    }));
    res.json(clientUsers);
  });

  // Get group messages
  app.get('/api/messages/group', authenticateUser, async (req, res) => {
    const messagesDrizzle = await storage.getGroupMessages(50);
    const messages = messagesDrizzle.map(toZodMessage).reverse(); // Convert and reverse
    res.json(messages);
  });

  // Send group message
  app.post('/api/messages/group', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const messageData = insertGroupMessageSchema.parse({
        ...req.body,
        sender: req.user!.username,
      });

      const createdMessageDrizzle = await storage.createGroupMessage(messageData);
      const createdMessage = toZodMessage(createdMessageDrizzle);
      
      // Broadcast to all users
      broadcastToAllUsers({
        type: 'new_group_message',
        message: createdMessage, // Send Zod-compatible message
      }, req.user!.username);

      res.json(createdMessage);
    } catch (error) {
      res.status(400).json({ message: 'Invalid message data' });
    }
  });

  // Get direct messages
  app.get('/api/messages/direct/:otherUser', authenticateUser, async (req: AuthenticatedRequest, res) => {
    const { otherUser } = req.params;
    const messagesDrizzle = await storage.getDirectMessages(req.user!.username, otherUser, 50);
    const messages = messagesDrizzle.map(toZodMessage).reverse(); // Convert and reverse
    res.json(messages);
  });

  // Send direct message
  app.post('/api/messages/direct', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const messageData = insertDirectMessageSchema.parse({
        ...req.body,
        fromUser: req.user!.username,
      });

      const createdMessageDrizzle = await storage.createDirectMessage(messageData);
      const createdMessage = toZodMessage(createdMessageDrizzle);
      
      // Send to recipient
      sendToUser(messageData.toUser, {
        type: 'new_direct_message',
        message: createdMessage, // Send Zod-compatible message
      });

      res.json(createdMessage);
    } catch (error) {
      res.status(400).json({ message: 'Invalid message data' });
    }
  });

  // Image upload endpoint
  app.post('/api/upload', authenticateUser, upload.single('image'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl: fileUrl });
  });

  // Serve uploaded files
  app.use('/uploads', express.static(uploadDir));

  // Edit group message
  app.put('/api/messages/group/:messageId', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { messageId } = req.params;
      const { content } = req.body;
      const username = req.user!.username;

      if (!content || typeof content !== 'string') {
        return res.status(400).json({ message: 'New content is required and must be a string' });
      }

      const updatedMessageDrizzle = await storage.editGroupMessage(messageId, username, content);

      if (!updatedMessageDrizzle) {
        return res.status(404).json({ message: 'Message not found or user not authorized to edit' });
      }
      const updatedMessage = toZodMessage(updatedMessageDrizzle);

      // Broadcast to all users about the edited message
      broadcastToAllUsers({
        type: 'edit_group_message',
        message: updatedMessage, // Send Zod-compatible message
      });

      res.json(updatedMessage);
    } catch (error) {
      console.error("Error editing group message:", error);
      res.status(500).json({ message: 'Error editing group message' });
    }
  });

  // Edit direct message
  app.put('/api/messages/direct/:messageId', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { messageId } = req.params;
      const { content } = req.body;
      const username = req.user!.username;

      if (!content || typeof content !== 'string') {
        return res.status(400).json({ message: 'New content is required and must be a string' });
      }

      const updatedMessageDrizzle = await storage.editDirectMessage(messageId, username, content);

      if (!updatedMessageDrizzle) {
        return res.status(404).json({ message: 'Message not found or user not authorized to edit' });
      }
      const updatedMessage = toZodMessage(updatedMessageDrizzle);

      // Send notification to the other user involved in the DM
      if (updatedMessage.fromUser === username) {
        sendToUser(updatedMessage.toUser, {
          type: 'edit_direct_message',
          message: updatedMessage, // Send Zod-compatible message
        });
      } else if (updatedMessage.toUser === username) { // Should not happen if only sender can edit
        sendToUser(updatedMessage.fromUser, {
          type: 'edit_direct_message',
          message: updatedMessage, // Send Zod-compatible message
        });
      }

      res.json(updatedMessage);
    } catch (error) {
      console.error("Error editing direct message:", error);
      res.status(500).json({ message: 'Error editing direct message' });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws, req) => {
    let username: string | null = null;

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'authenticate') {
          const token = message.token;
          if (!token || typeof token !== 'string') {
            ws.send(JSON.stringify({ type: 'auth_failed', message: 'Token is required.' }));
            return ws.close();
          }

          const decoded = Buffer.from(token, 'base64').toString();
          const [userFromToken, passwordFromToken] = decoded.split(':'); 
          
          const allowedUserInfo = ALLOWED_USERS[userFromToken.toLowerCase()];
          if (!allowedUserInfo || allowedUserInfo.password_plaintext !== passwordFromToken) {
            ws.send(JSON.stringify({ type: 'auth_failed', message: 'Invalid token or user not allowed.' }));
            return ws.close();
          }
          
          const userRecord = await storage.getUserByUsername(userFromToken);

          if (userRecord) {
            username = userRecord.username; // Assign to connection-scoped username
            
            if (!wsConnections.has(username)) {
              wsConnections.set(username, []);
            }
            wsConnections.get(username)!.push(ws);

            await storage.updateUserOnlineStatus(username, true);
            // Fetch the latest user data to ensure it includes any updates (like lastSeen)
            const updatedUserForBroadcast = await storage.getUserByUsername(username);

            if (updatedUserForBroadcast) {
                const clientUserPayload: Partial<ClientUser> & { username: string } = {
                    id: updatedUserForBroadcast.id,
                    username: updatedUserForBroadcast.username,
                    isAdmin: updatedUserForBroadcast.isAdmin,
                    isOnline: updatedUserForBroadcast.isOnline,
                    lastSeen: updatedUserForBroadcast.lastSeen?.toISOString(),
                    createdAt: updatedUserForBroadcast.createdAt?.toISOString(),
                };
              
              // Broadcast user_online with ClientUser compatible payload
              broadcastToAllUsers({
                type: 'user_online',
                user: clientUserPayload,
              });
              
              // Send authenticated message back to this client
              ws.send(JSON.stringify({
                type: 'authenticated',
                user: clientUserPayload, 
              }));
            } else {
                 // This case should ideally not be reached if userRecord was found
                 ws.send(JSON.stringify({ type: 'auth_failed', message: 'User record disappeared unexpectedly.' }));
                 ws.close();
            }
          } else {
            // This case implies token was valid against ALLOWED_USERS but user not in DB (should not happen if login creates user)
            ws.send(JSON.stringify({ type: 'auth_failed', message: 'User not found in database despite valid token components.' }));
            ws.close();
          }
        } else if (message.type === 'typing' && username) {
          broadcastToAllUsers({
            type: 'user_typing',
            username,
            isTyping: message.isTyping,
          }, username);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', async () => {
      if (username) {
        // Remove connection
        const connections = wsConnections.get(username) || [];
        const index = connections.indexOf(ws);
        if (index > -1) {
          connections.splice(index, 1);
        }

        // If no more connections, mark user offline
        if (connections.length === 0) {
          wsConnections.delete(username);
          await storage.updateUserOnlineStatus(username, false);
          const userOfflineRecord = await storage.getUserByUsername(username); // Get updated lastSeen
          
          broadcastToAllUsers({
            type: 'user_offline',
            username,
            lastSeen: userOfflineRecord?.lastSeen?.toISOString() || new Date().toISOString(), // Ensure ISO string
          });
        }
      }
    });
  });

  return httpServer;
}
