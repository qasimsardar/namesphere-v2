import {
  users,
  userCredentials,
  identities,
  auditLogs,
  type User,
  type UpsertUser,
  type UserCredentials,
  type InsertUserCredentials,
  type Identity,
  type InsertIdentity,
  type UpdateIdentity,
  type InsertAuditLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // User operations (supports both Replit Auth and username/password)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // User credentials operations (for username/password auth)
  createUserCredentials(credentials: InsertUserCredentials): Promise<UserCredentials>;
  getUserCredentialsByUsername(username: string): Promise<UserCredentials | undefined>;
  getUserByCredentialsId(credentialsId: string): Promise<User | undefined>;
  
  // Cross-user context access
  getIdentitiesByUserAndContext(targetUserId: string, context: string, requestingUserId: string): Promise<Identity[]>;
  
  // Identity operations
  getIdentities(userId: string, context?: string): Promise<Identity[]>;
  getIdentity(id: string, userId: string): Promise<Identity | undefined>;
  createIdentity(userId: string, identity: InsertIdentity): Promise<Identity>;
  updateIdentity(id: string, userId: string, updates: UpdateIdentity): Promise<Identity | undefined>;
  deleteIdentity(id: string, userId: string): Promise<boolean>;
  setPrimaryIdentity(id: string, userId: string): Promise<Identity | undefined>;
  getPrimaryIdentity(userId: string): Promise<Identity | undefined>;
  
  // Audit operations
  createAuditLog(auditLog: InsertAuditLog): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async createUserCredentials(credentials: InsertUserCredentials): Promise<UserCredentials> {
    const [userCreds] = await db
      .insert(userCredentials)
      .values(credentials)
      .returning();
    return userCreds;
  }

  async getUserCredentialsByUsername(username: string): Promise<UserCredentials | undefined> {
    const [creds] = await db
      .select()
      .from(userCredentials)
      .where(eq(userCredentials.username, username));
    return creds;
  }

  async getUserByCredentialsId(credentialsId: string): Promise<User | undefined> {
    const [result] = await db
      .select()
      .from(users)
      .innerJoin(userCredentials, eq(users.id, userCredentials.userId))
      .where(eq(userCredentials.id, credentialsId));
    return result?.users;
  }

  async getIdentitiesByUserAndContext(targetUserId: string, context: string, requestingUserId: string): Promise<Identity[]> {
    // This is where we implement the cross-user context access logic
    // For now, we'll allow access to any user's identities in any context
    // In a real implementation, you'd add authorization logic here
    const results = await db
      .select()
      .from(identities)
      .where(and(eq(identities.userId, targetUserId), eq(identities.context, context)))
      .orderBy(desc(identities.isPrimary), desc(identities.createdAt));

    // Create audit log for cross-user access
    await this.createAuditLog({
      userId: requestingUserId,
      entity: "identity",
      entityId: targetUserId,
      operation: "cross-user-access",
      diff: { context, targetUserId, accessedCount: results.length },
    });

    return results;
  }

  async getIdentities(userId: string, context?: string): Promise<Identity[]> {
    const conditions = [eq(identities.userId, userId)];
    if (context) {
      conditions.push(eq(identities.context, context));
    }

    const results = await db
      .select()
      .from(identities)
      .where(and(...conditions))
      .orderBy(desc(identities.isPrimary), desc(identities.createdAt));

    return results;
  }

  async getIdentity(id: string, userId: string): Promise<Identity | undefined> {
    const [identity] = await db
      .select()
      .from(identities)
      .where(and(eq(identities.id, id), eq(identities.userId, userId)));
    
    return identity;
  }

  async createIdentity(userId: string, identity: InsertIdentity): Promise<Identity> {
    return await db.transaction(async (tx) => {
      // If this should be primary, unset the current primary
      if (identity.isPrimary) {
        await tx
          .update(identities)
          .set({ isPrimary: false, updatedAt: new Date() })
          .where(and(eq(identities.userId, userId), eq(identities.isPrimary, true)));
      }

      const [newIdentity] = await tx
        .insert(identities)
        .values({ ...identity, userId })
        .returning();

      // Create audit log
      await tx.insert(auditLogs).values({
        userId,
        entity: "identity",
        entityId: newIdentity.id,
        operation: "create",
        diff: { created: newIdentity },
      });

      return newIdentity;
    });
  }

  async updateIdentity(id: string, userId: string, updates: UpdateIdentity): Promise<Identity | undefined> {
    return await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(identities)
        .where(and(eq(identities.id, id), eq(identities.userId, userId)));

      if (!existing) return undefined;

      // If setting as primary, unset the current primary
      if (updates.isPrimary) {
        await tx
          .update(identities)
          .set({ isPrimary: false, updatedAt: new Date() })
          .where(and(eq(identities.userId, userId), eq(identities.isPrimary, true)));
      }

      const [updated] = await tx
        .update(identities)
        .set({ ...updates, updatedAt: new Date() })
        .where(and(eq(identities.id, id), eq(identities.userId, userId)))
        .returning();

      // Create audit log
      await tx.insert(auditLogs).values({
        userId,
        entity: "identity",
        entityId: id,
        operation: "update",
        diff: { before: existing, after: updated },
      });

      return updated;
    });
  }

  async deleteIdentity(id: string, userId: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(identities)
        .where(and(eq(identities.id, id), eq(identities.userId, userId)));

      if (!existing) return false;

      const result = await tx
        .delete(identities)
        .where(and(eq(identities.id, id), eq(identities.userId, userId)));

      // Create audit log
      await tx.insert(auditLogs).values({
        userId,
        entity: "identity",
        entityId: id,
        operation: "delete",
        diff: { deleted: existing },
      });

      return (result.rowCount || 0) > 0;
    });
  }

  async setPrimaryIdentity(id: string, userId: string): Promise<Identity | undefined> {
    return await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(identities)
        .where(and(eq(identities.id, id), eq(identities.userId, userId)));

      if (!existing) return undefined;

      // Unset current primary
      await tx
        .update(identities)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(and(eq(identities.userId, userId), eq(identities.isPrimary, true)));

      // Set new primary
      const [updated] = await tx
        .update(identities)
        .set({ isPrimary: true, updatedAt: new Date() })
        .where(and(eq(identities.id, id), eq(identities.userId, userId)))
        .returning();

      // Create audit log
      await tx.insert(auditLogs).values({
        userId,
        entity: "identity",
        entityId: id,
        operation: "set-primary",
        diff: { before: existing, after: updated },
      });

      return updated;
    });
  }

  async getPrimaryIdentity(userId: string): Promise<Identity | undefined> {
    const [identity] = await db
      .select()
      .from(identities)
      .where(and(eq(identities.userId, userId), eq(identities.isPrimary, true)));
    
    return identity;
  }

  async createAuditLog(auditLog: InsertAuditLog): Promise<void> {
    await db.insert(auditLogs).values(auditLog);
  }
}

export const storage = new DatabaseStorage();
