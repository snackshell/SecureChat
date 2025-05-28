import { pgTable, text, serial, timestamp, varchar, boolean, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  isOnline: boolean("is_online").default(false).notNull(),
  lastSeen: timestamp("last_seen").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Group messages table
export const groupMessages = pgTable("group_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  sender: varchar("sender", { length: 50 }).notNull(),
  content: text("content"),
  imageUrl: text("image_url"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Direct messages table
export const directMessages = pgTable("direct_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  fromUser: varchar("from_user", { length: 50 }).notNull(),
  toUser: varchar("to_user", { length: 50 }).notNull(),
  content: text("content"),
  imageUrl: text("image_url"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  sentGroupMessages: many(groupMessages),
  sentDirectMessages: many(directMessages),
  receivedDirectMessages: many(directMessages),
}));

export const groupMessagesRelations = relations(groupMessages, ({ one }) => ({
  sender: one(users, {
    fields: [groupMessages.sender],
    references: [users.username],
  }),
}));

export const directMessagesRelations = relations(directMessages, ({ one }) => ({
  fromUser: one(users, {
    fields: [directMessages.fromUser],
    references: [users.username],
  }),
  toUser: one(users, {
    fields: [directMessages.toUser],
    references: [users.username],
  }),
}));

// Schemas for validation
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  isAdmin: true,
});

export const insertGroupMessageSchema = createInsertSchema(groupMessages).pick({
  sender: true,
  content: true,
  imageUrl: true,
});

export const insertDirectMessageSchema = createInsertSchema(directMessages).pick({
  fromUser: true,
  toUser: true,
  content: true,
  imageUrl: true,
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type GroupMessage = typeof groupMessages.$inferSelect;
export type InsertGroupMessage = z.infer<typeof insertGroupMessageSchema>;
export type DirectMessage = typeof directMessages.$inferSelect;
export type InsertDirectMessage = z.infer<typeof insertDirectMessageSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
