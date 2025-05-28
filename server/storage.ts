import { 
  users, 
  groupMessages, 
  directMessages,
  type User, 
  type InsertUser,
  type GroupMessageDrizzle,
  type InsertGroupMessage,
  type DirectMessageDrizzle,
  type InsertDirectMessage
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, or, and } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserOnlineStatus(username: string, isOnline: boolean): Promise<void>;
  getAllOnlineUsers(): Promise<User[]>;
  
  // Group message operations
  createGroupMessage(message: InsertGroupMessage): Promise<GroupMessageDrizzle>;
  getGroupMessages(limit?: number): Promise<GroupMessageDrizzle[]>;
  editGroupMessage(messageId: string, senderUsername: string, newContent: string): Promise<GroupMessageDrizzle | undefined>;
  
  // Direct message operations
  createDirectMessage(message: InsertDirectMessage): Promise<DirectMessageDrizzle>;
  getDirectMessages(user1: string, user2: string, limit?: number): Promise<DirectMessageDrizzle[]>;
  editDirectMessage(messageId: string, editorUsername: string, newContent: string): Promise<DirectMessageDrizzle | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserOnlineStatus(username: string, isOnline: boolean): Promise<void> {
    await db
      .update(users)
      .set({ 
        isOnline, 
        lastSeen: new Date() 
      })
      .where(eq(users.username, username));
  }

  async getAllOnlineUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.isOnline, true));
  }

  async createGroupMessage(message: InsertGroupMessage): Promise<GroupMessageDrizzle> {
    const [groupMessage] = await db
      .insert(groupMessages)
      .values(message)
      .returning();
    return groupMessage;
  }

  async getGroupMessages(limit: number = 50): Promise<GroupMessageDrizzle[]> {
    return await db
      .select()
      .from(groupMessages)
      .orderBy(desc(groupMessages.timestamp))
      .limit(limit);
  }

  async editGroupMessage(messageId: string, senderUsername: string, newContent: string): Promise<GroupMessageDrizzle | undefined> {
    const [updatedMessage] = await db
      .update(groupMessages)
      .set({
        content: newContent,
        isEdited: true,
        updatedAt: new Date(),
      })
      .where(and(eq(groupMessages.id, messageId), eq(groupMessages.sender, senderUsername)))
      .returning();
    return updatedMessage || undefined;
  }

  async createDirectMessage(message: InsertDirectMessage): Promise<DirectMessageDrizzle> {
    const [directMessage] = await db
      .insert(directMessages)
      .values(message)
      .returning();
    return directMessage;
  }

  async getDirectMessages(user1: string, user2: string, limit: number = 50): Promise<DirectMessageDrizzle[]> {
    return await db
      .select()
      .from(directMessages)
      .where(
        or(
          and(eq(directMessages.fromUser, user1), eq(directMessages.toUser, user2)),
          and(eq(directMessages.fromUser, user2), eq(directMessages.toUser, user1))
        )
      )
      .orderBy(desc(directMessages.timestamp))
      .limit(limit);
  }

  async editDirectMessage(messageId: string, editorUsername: string, newContent: string): Promise<DirectMessageDrizzle | undefined> {
    const [updatedMessage] = await db
      .update(directMessages)
      .set({
        content: newContent,
        isEdited: true,
        updatedAt: new Date(),
      })
      .where(and(eq(directMessages.id, messageId), eq(directMessages.fromUser, editorUsername)))
      .returning();
    // Ensure the message is returned with all fields for the frontend/WS broadcast
    if (updatedMessage) {
        const [fullMessage] = await db.select().from(directMessages).where(eq(directMessages.id, updatedMessage.id));
        return fullMessage || undefined;
    }
    return undefined;
  }
}

export const storage = new DatabaseStorage();
