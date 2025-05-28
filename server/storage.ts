import { 
  users, 
  groupMessages, 
  directMessages,
  type User, 
  type InsertUser,
  type GroupMessage,
  type InsertGroupMessage,
  type DirectMessage,
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
  createGroupMessage(message: InsertGroupMessage): Promise<GroupMessage>;
  getGroupMessages(limit?: number): Promise<GroupMessage[]>;
  
  // Direct message operations
  createDirectMessage(message: InsertDirectMessage): Promise<DirectMessage>;
  getDirectMessages(user1: string, user2: string, limit?: number): Promise<DirectMessage[]>;
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

  async createGroupMessage(message: InsertGroupMessage): Promise<GroupMessage> {
    const [groupMessage] = await db
      .insert(groupMessages)
      .values(message)
      .returning();
    return groupMessage;
  }

  async getGroupMessages(limit: number = 50): Promise<GroupMessage[]> {
    return await db
      .select()
      .from(groupMessages)
      .orderBy(desc(groupMessages.timestamp))
      .limit(limit);
  }

  async createDirectMessage(message: InsertDirectMessage): Promise<DirectMessage> {
    const [directMessage] = await db
      .insert(directMessages)
      .values(message)
      .returning();
    return directMessage;
  }

  async getDirectMessages(user1: string, user2: string, limit: number = 50): Promise<DirectMessage[]> {
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
}

export const storage = new DatabaseStorage();
