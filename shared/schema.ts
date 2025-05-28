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
  isEdited: boolean("is_edited").default(false).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Direct messages table
export const directMessages = pgTable("direct_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  fromUser: varchar("from_user", { length: 50 }).notNull(),
  toUser: varchar("to_user", { length: 50 }).notNull(),
  content: text("content"),
  imageUrl: text("image_url"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  isEdited: boolean("is_edited").default(false).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
export type GroupMessageDrizzle = typeof groupMessages.$inferSelect;
export type InsertGroupMessage = z.infer<typeof insertGroupMessageSchema>;
export type DirectMessageDrizzle = typeof directMessages.$inferSelect;
export type InsertDirectMessage = z.infer<typeof insertDirectMessageSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;

// Zod schemas for client-side validation and API payloads
// These should generally align with the Drizzle schema select types but can be more specific for payloads

export const ClientUserSchema = z.object({
  id: z.number().int().optional(),
  username: z.string(),
  isAdmin: z.boolean().optional(),
  isOnline: z.boolean().optional(),
  lastSeen: z.string().datetime({ precision: 3, offset: true }).optional().nullable(), 
  socketId: z.string().optional().nullable(),
  createdAt: z.string().datetime({ precision: 3, offset: true }).optional(), 
});
export type ClientUser = z.infer<typeof ClientUserSchema>; 

export const GroupMessageSchema = z.object({
  id: z.string().uuid().optional(), 
  sender: z.string(),
  content: z.string().optional().nullable(), 
  imageUrl: z.string().url().optional().nullable(),
  timestamp: z.string().datetime({ precision: 3, offset: true }), 
  isEdited: z.boolean().optional().default(false),
  updatedAt: z.string().datetime({ precision: 3, offset: true }).optional().nullable(), 
});
export type GroupMessage = z.infer<typeof GroupMessageSchema>;

export const DirectMessageSchema = z.object({
  id: z.string().uuid().optional(), 
  fromUser: z.string(),
  toUser: z.string(),
  content: z.string().optional().nullable(), 
  imageUrl: z.string().url().optional().nullable(),
  timestamp: z.string().datetime({ precision: 3, offset: true }), 
  isEdited: z.boolean().optional().default(false),
  updatedAt: z.string().datetime({ precision: 3, offset: true }).optional().nullable(),
});
export type DirectMessage = z.infer<typeof DirectMessageSchema>;

// API Schemas (some might be duplicates of Drizzle insert schemas if simple enough)
// Re-defining here for clarity and potential payload-specific adjustments

export const LoginRequestSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(4, "Password must be at least 4 characters"),
});
// LoginRequest type is already defined above from loginSchema, no need to redefine if identical
// export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const RegisterRequestSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(4, "Password must be at least 4 characters"),
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const SendMessageRequestSchema = z.object({
  content: z.string().optional(),
  imageUrl: z.string().url().optional(),
});
export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>;

export const SendDirectMessageRequestSchema = z.object({
  toUser: z.string(),
  content: z.string().optional(),
  imageUrl: z.string().url().optional(),
});
export type SendDirectMessageRequest = z.infer<typeof SendDirectMessageRequestSchema>;

// WebSocket Event Payloads
export const TypingPayloadSchema = z.object({
  isTyping: z.boolean(),
  username: z.string(),
});
export type TypingPayload = z.infer<typeof TypingPayloadSchema>;

export const NewGroupMessagePayloadSchema = GroupMessageSchema;
export type NewGroupMessagePayload = GroupMessage;

export const NewDirectMessagePayloadSchema = DirectMessageSchema;
export type NewDirectMessagePayload = DirectMessage;

export const UserOnlinePayloadSchema = z.object({
  user: ClientUserSchema.pick({
    id: true,
    username: true,
    isAdmin: true,
    isOnline: true,
    lastSeen: true,
    createdAt: true,
  }),
});
export type UserOnlinePayload = z.infer<typeof UserOnlinePayloadSchema>;

export const UserOfflinePayloadSchema = z.object({
  username: z.string(),
  lastSeen: z.string().datetime({ precision: 3, offset: true }),
});
export type UserOfflinePayload = z.infer<typeof UserOfflinePayloadSchema>;

// Added for message editing
export const EditMessagePayloadSchema = z.object({
  messageId: z.string().uuid(), 
  newContent: z.string(),
  isGroupMessage: z.boolean(), 
  updatedAt: z.string().datetime({ precision: 3, offset: true }),
});
export type EditMessagePayload = z.infer<typeof EditMessagePayloadSchema>;
