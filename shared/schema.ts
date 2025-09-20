import { sql, relations } from 'drizzle-orm';
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Identity profiles table
export const identities = pgTable("identities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  personalName: text("personal_name").notNull(),
  context: text("context").notNull(),
  otherNames: text("other_names").array().default([]),
  // Optional attributes for enhanced identity profiles
  pronouns: text("pronouns"),
  title: text("title"),
  avatarUrl: text("avatar_url"),
  socialLinks: jsonb("social_links").default({}), // {platform: url} mapping
  isPrimary: boolean("is_primary").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("identities_user_id_idx").on(table.userId),
  index("identities_context_idx").on(table.context),
]);

// Audit log table
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  entity: text("entity").notNull(),
  entityId: varchar("entity_id").notNull(),
  operation: text("operation").notNull(), // create|update|delete|set-primary
  diff: jsonb("diff"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("audit_logs_user_id_idx").on(table.userId),
  index("audit_logs_entity_idx").on(table.entity),
]);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  identities: many(identities),
  auditLogs: many(auditLogs),
}));

export const identitiesRelations = relations(identities, ({ one }) => ({
  user: one(users, {
    fields: [identities.userId],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// Schema types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const insertIdentitySchema = createInsertSchema(identities, {
  socialLinks: z.record(z.string(), z.string().url()).optional().default({}),
}).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const updateIdentitySchema = insertIdentitySchema.partial();

export type InsertIdentity = z.infer<typeof insertIdentitySchema>;
export type UpdateIdentity = z.infer<typeof updateIdentitySchema>;
export type Identity = typeof identities.$inferSelect;

export type InsertAuditLog = typeof auditLogs.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
