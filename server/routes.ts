import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { loginSchema, insertGroupMessageSchema, insertDirectMessageSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";

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
    // Simple token validation (username:password base64)
    const decoded = Buffer.from(token, 'base64').toString();
    const [username] = decoded.split(':');
    
    const user = await storage.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ message: 'Invalid user' });
    }

    req.user = { username: user.username, isAdmin: user.isAdmin };
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Login endpoint
  app.post('/api/login', async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);

      // Check credentials
      if (password === '2025' || (username === 'adu' && password === '1995')) {
        const isAdmin = username === 'adu';
        
        // Create or update user
        let user = await storage.getUserByUsername(username);
        if (!user) {
          user = await storage.createUser({
            username,
            password: password, // In production, hash this
            isAdmin,
          });
        }

        // Update online status
        await storage.updateUserOnlineStatus(username, true);

        // Create simple token
        const token = Buffer.from(`${username}:${password}`).toString('base64');
        
        res.json({
          token,
          user: {
            username: user.username,
            isAdmin: user.isAdmin,
          },
        });
      } else {
        res.status(401).json({ message: 'Invalid credentials' });
      }
    } catch (error) {
      res.status(400).json({ message: 'Invalid request data' });
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
    const users = await storage.getAllOnlineUsers();
    res.json(users);
  });

  // Get group messages
  app.get('/api/messages/group', authenticateUser, async (req, res) => {
    const messages = await storage.getGroupMessages(50);
    res.json(messages.reverse()); // Return in chronological order
  });

  // Send group message
  app.post('/api/messages/group', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const messageData = insertGroupMessageSchema.parse({
        ...req.body,
        sender: req.user!.username,
      });

      const message = await storage.createGroupMessage(messageData);
      
      // Broadcast to all users
      broadcastToAllUsers({
        type: 'new_group_message',
        message,
      }, req.user!.username);

      res.json(message);
    } catch (error) {
      res.status(400).json({ message: 'Invalid message data' });
    }
  });

  // Get direct messages
  app.get('/api/messages/direct/:otherUser', authenticateUser, async (req: AuthenticatedRequest, res) => {
    const { otherUser } = req.params;
    const messages = await storage.getDirectMessages(req.user!.username, otherUser, 50);
    res.json(messages.reverse()); // Return in chronological order
  });

  // Send direct message
  app.post('/api/messages/direct', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const messageData = insertDirectMessageSchema.parse({
        ...req.body,
        fromUser: req.user!.username,
      });

      const message = await storage.createDirectMessage(messageData);
      
      // Send to recipient
      sendToUser(messageData.toUser, {
        type: 'new_direct_message',
        message,
      });

      res.json(message);
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
          const decoded = Buffer.from(token, 'base64').toString();
          const [user] = decoded.split(':');
          
          const userRecord = await storage.getUserByUsername(user);
          if (userRecord) {
            username = user;
            
            // Add connection to user's connections
            if (!wsConnections.has(username)) {
              wsConnections.set(username, []);
            }
            wsConnections.get(username)!.push(ws);

            // Update online status
            await storage.updateUserOnlineStatus(username, true);

            // Broadcast user online
            broadcastToAllUsers({
              type: 'user_online',
              username,
            });

            ws.send(JSON.stringify({
              type: 'authenticated',
              username,
            }));
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
          
          broadcastToAllUsers({
            type: 'user_offline',
            username,
          });
        }
      }
    });
  });

  return httpServer;
}
