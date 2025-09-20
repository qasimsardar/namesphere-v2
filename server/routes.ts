import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertIdentitySchema, updateIdentitySchema } from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

interface AuthenticatedRequest extends Request {
  user?: {
    claims: {
      sub: string;
      email?: string;
      first_name?: string;
      last_name?: string;
      profile_image_url?: string;
    };
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req, res) => {
    try {
      const authUser = req.user as any;
      if (!authUser?.claims?.sub) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userId = authUser.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Identity routes
  app.get('/api/identities', isAuthenticated, async (req, res) => {
    try {
      const authUser = req.user as any;
      if (!authUser?.claims?.sub) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userId = authUser.claims.sub;
      const context = req.query.context as string | undefined;
      
      const identities = await storage.getIdentities(userId, context);
      
      if (context) {
        // Return only identities matching the context
        res.json({ identities });
      } else {
        // Return primary identity first, then all others
        const primaryIdentity = identities.find(i => i.isPrimary);
        if (primaryIdentity) {
          res.json({ 
            primary: primaryIdentity,
            identities: identities 
          });
        } else {
          res.json({ identities });
        }
      }
    } catch (error) {
      console.error("Error fetching identities:", error);
      res.status(500).json({ message: "Failed to fetch identities" });
    }
  });

  app.get('/api/identities/:id', isAuthenticated, async (req, res) => {
    try {
      const authUser = req.user as any;
      if (!authUser?.claims?.sub) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userId = authUser.claims.sub;
      const { id } = req.params;
      
      const identity = await storage.getIdentity(id, userId);
      if (!identity) {
        return res.status(404).json({ message: "Identity not found" });
      }
      
      res.json(identity);
    } catch (error) {
      console.error("Error fetching identity:", error);
      res.status(500).json({ message: "Failed to fetch identity" });
    }
  });

  app.post('/api/identities', isAuthenticated, async (req, res) => {
    try {
      const authUser = req.user as any;
      if (!authUser?.claims?.sub) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userId = authUser.claims.sub;
      
      // Validate request body
      const validation = insertIdentitySchema.safeParse(req.body);
      if (!validation.success) {
        const error = fromZodError(validation.error);
        return res.status(400).json({ 
          message: "Validation error", 
          details: error.message 
        });
      }

      const identityData = validation.data;
      
      // Check for existing primary if this should be primary
      if (identityData.isPrimary) {
        const existingPrimary = await storage.getPrimaryIdentity(userId);
        if (existingPrimary) {
          identityData.isPrimary = true; // Will be handled in storage transaction
        }
      }

      const identity = await storage.createIdentity(userId, identityData);
      res.status(201).json(identity);
    } catch (error) {
      console.error("Error creating identity:", error);
      res.status(500).json({ message: "Failed to create identity" });
    }
  });

  app.put('/api/identities/:id', isAuthenticated, async (req, res) => {
    try {
      const authUser = req.user as any;
      if (!authUser?.claims?.sub) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userId = authUser.claims.sub;
      const { id } = req.params;
      
      // Validate request body
      const validation = updateIdentitySchema.safeParse(req.body);
      if (!validation.success) {
        const error = fromZodError(validation.error);
        return res.status(400).json({ 
          message: "Validation error", 
          details: error.message 
        });
      }

      const updates = validation.data;
      const identity = await storage.updateIdentity(id, userId, updates);
      
      if (!identity) {
        return res.status(404).json({ message: "Identity not found" });
      }
      
      res.json(identity);
    } catch (error) {
      console.error("Error updating identity:", error);
      res.status(500).json({ message: "Failed to update identity" });
    }
  });

  app.delete('/api/identities/:id', isAuthenticated, async (req, res) => {
    try {
      const authUser = req.user as any;
      if (!authUser?.claims?.sub) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userId = authUser.claims.sub;
      const { id } = req.params;
      
      // Check if this is the only identity
      const allIdentities = await storage.getIdentities(userId);
      if (allIdentities.length === 1) {
        return res.status(400).json({ 
          message: "Cannot delete your only identity" 
        });
      }
      
      const success = await storage.deleteIdentity(id, userId);
      if (!success) {
        return res.status(404).json({ message: "Identity not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting identity:", error);
      res.status(500).json({ message: "Failed to delete identity" });
    }
  });

  app.post('/api/identities/:id/set-primary', isAuthenticated, async (req, res) => {
    try {
      const authUser = req.user as any;
      if (!authUser?.claims?.sub) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userId = authUser.claims.sub;
      const { id } = req.params;
      
      const identity = await storage.setPrimaryIdentity(id, userId);
      if (!identity) {
        return res.status(404).json({ message: "Identity not found" });
      }
      
      res.json(identity);
    } catch (error) {
      console.error("Error setting primary identity:", error);
      res.status(500).json({ message: "Failed to set primary identity" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
