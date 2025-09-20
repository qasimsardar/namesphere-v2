import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertIdentitySchema, updateIdentitySchema, type Identity } from "@shared/schema";
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

// Content negotiation helpers
function negotiateContent(req: Request): 'json' | 'json-api' | 'csv' | 'xml' {
  const acceptHeader = req.headers.accept || 'application/json';
  
  if (acceptHeader.includes('application/vnd.api+json')) {
    return 'json-api';
  } else if (acceptHeader.includes('text/csv')) {
    return 'csv';
  } else if (acceptHeader.includes('application/xml')) {
    return 'xml';
  } else {
    return 'json';
  }
}

function formatResponse(data: any, format: 'json' | 'json-api' | 'csv' | 'xml', req: Request): { content: string; contentType: string } {
  switch (format) {
    case 'json-api':
      return {
        content: JSON.stringify(formatAsJsonApi(data, req)),
        contentType: 'application/vnd.api+json'
      };
    case 'csv':
      return {
        content: formatAsCsv(data),
        contentType: 'text/csv; charset=utf-8'
      };
    case 'xml':
      return {
        content: formatAsXml(data),
        contentType: 'application/xml; charset=utf-8'
      };
    default:
      return {
        content: JSON.stringify(data),
        contentType: 'application/json'
      };
  }
}

function formatAsJsonApi(data: any, req: Request): any {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  
  if (Array.isArray(data.identities)) {
    // Multiple identities
    const jsonApiData = data.identities.map((identity: Identity) => ({
      type: 'identity',
      id: identity.id,
      attributes: {
        personalName: identity.personalName,
        context: identity.context,
        otherNames: identity.otherNames,
        pronouns: identity.pronouns,
        title: identity.title,
        avatarUrl: identity.avatarUrl,
        socialLinks: identity.socialLinks,
        isPrimary: identity.isPrimary,
        createdAt: identity.createdAt,
        updatedAt: identity.updatedAt
      },
      links: {
        self: `${baseUrl}/api/identities/${identity.id}`
      }
    }));

    return {
      data: jsonApiData,
      meta: {
        total: jsonApiData.length,
        primary: data.primary ? data.primary.id : null
      },
      links: {
        self: `${baseUrl}${req.originalUrl}`
      }
    };
  } else if (data.id) {
    // Single identity
    return {
      data: {
        type: 'identity',
        id: data.id,
        attributes: {
          personalName: data.personalName,
          context: data.context,
          otherNames: data.otherNames,
          pronouns: data.pronouns,
          title: data.title,
          avatarUrl: data.avatarUrl,
          socialLinks: data.socialLinks,
          isPrimary: data.isPrimary,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        },
        links: {
          self: `${baseUrl}/api/identities/${data.id}`
        }
      }
    };
  } else {
    return { data };
  }
}

function escapeCsv(value: string): string {
  // Prevent CSV formula injection by prefixing with single quote if starts with formula chars
  if (value.startsWith('=') || value.startsWith('+') || value.startsWith('-') || value.startsWith('@')) {
    value = "'" + value;
  }
  
  if (value.includes(',') || value.includes('\n') || value.includes('\r') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatAsCsv(data: any): string {
  let identities = [];
  if (Array.isArray(data.identities)) {
    identities = data.identities;
  } else if (data.id) {
    identities = [data];
  } else {
    // Handle error responses properly for CSV
    const message = data.message || 'No data available';
    return `error\n"${escapeCsv(message)}"`;
  }

  if (identities.length === 0) {
    return 'error\n"No identities found"';
  }

  const headers = ['id', 'personalName', 'context', 'otherNames', 'pronouns', 'title', 'avatarUrl', 'socialLinks', 'isPrimary', 'createdAt', 'updatedAt'];
  const csvRows = [headers.join(',')];

  identities.forEach((identity: Identity) => {
    const row = [
      escapeCsv(identity.id || ''),
      escapeCsv(identity.personalName || ''),
      escapeCsv(identity.context || ''),
      escapeCsv((identity.otherNames || []).join('; ')),
      escapeCsv(identity.pronouns || ''),
      escapeCsv(identity.title || ''),
      escapeCsv(identity.avatarUrl || ''),
      escapeCsv(identity.socialLinks ? JSON.stringify(identity.socialLinks) : ''),
      identity.isPrimary ? 'true' : 'false',
      escapeCsv(identity.createdAt ? identity.createdAt.toString() : ''),
      escapeCsv(identity.updatedAt ? identity.updatedAt.toString() : '')
    ];
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeCdata(text: string): string {
  // Handle CDATA edge case - if text contains "]]>", we need to split it
  if (text.includes(']]>')) {
    const parts = text.split(']]>');
    return parts.map(part => `<![CDATA[${part}]]>`).join(']]&gt;');
  }
  return `<![CDATA[${text}]]>`;
}

function formatAsXml(data: any): string {
  let identities = [];
  if (Array.isArray(data.identities)) {
    identities = data.identities;
  } else if (data.id) {
    identities = [data];
  } else {
    // Handle error responses properly for XML
    const message = data.message || 'No data available';
    return `<?xml version="1.0" encoding="UTF-8"?><response><error><message>${safeCdata(message)}</message></error></response>`;
  }

  const xmlLines = ['<?xml version="1.0" encoding="UTF-8"?>', '<identities>'];
  
  identities.forEach((identity: Identity) => {
    xmlLines.push('  <identity>');
    xmlLines.push(`    <id>${safeCdata(identity.id || '')}</id>`);
    xmlLines.push(`    <personalName>${safeCdata(identity.personalName || '')}</personalName>`);
    xmlLines.push(`    <context>${safeCdata(identity.context || '')}</context>`);
    
    if (identity.otherNames && identity.otherNames.length > 0) {
      xmlLines.push('    <otherNames>');
      identity.otherNames.forEach(name => {
        xmlLines.push(`      <name>${safeCdata(name)}</name>`);
      });
      xmlLines.push('    </otherNames>');
    }
    
    if (identity.pronouns) xmlLines.push(`    <pronouns>${safeCdata(identity.pronouns)}</pronouns>`);
    if (identity.title) xmlLines.push(`    <title>${safeCdata(identity.title)}</title>`);
    if (identity.avatarUrl) xmlLines.push(`    <avatarUrl>${safeCdata(identity.avatarUrl)}</avatarUrl>`);
    
    if (identity.socialLinks && Object.keys(identity.socialLinks).length > 0) {
      xmlLines.push('    <socialLinks>');
      Object.entries(identity.socialLinks as Record<string, string>).forEach(([platform, url]) => {
        xmlLines.push(`      <link platform="${escapeXml(platform)}">${safeCdata(url)}</link>`);
      });
      xmlLines.push('    </socialLinks>');
    }
    
    xmlLines.push(`    <isPrimary>${identity.isPrimary ? 'true' : 'false'}</isPrimary>`);
    xmlLines.push(`    <createdAt>${safeCdata(identity.createdAt ? identity.createdAt.toString() : '')}</createdAt>`);
    xmlLines.push(`    <updatedAt>${safeCdata(identity.updatedAt ? identity.updatedAt.toString() : '')}</updatedAt>`);
    xmlLines.push('  </identity>');
  });
  
  xmlLines.push('</identities>');
  return xmlLines.join('\n');
}

// Helper function to send formatted responses based on Accept header
function sendFormattedResponse(res: Response, data: any, req: Request, statusCode: number = 200) {
  const format = negotiateContent(req);
  const { content, contentType } = formatResponse(data, format, req);
  
  res.status(statusCode)
    .set('Content-Type', contentType)
    .send(content);
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

  // Identity routes with content negotiation
  app.get('/api/identities', isAuthenticated, async (req, res) => {
    try {
      const authUser = req.user as any;
      if (!authUser?.claims?.sub) {
        return sendFormattedResponse(res, { message: "Unauthorized" }, req, 401);
      }
      const userId = authUser.claims.sub;
      const context = req.query.context as string | undefined;
      
      const identities = await storage.getIdentities(userId, context);
      
      let responseData;
      if (context) {
        // Return only identities matching the context
        responseData = { identities };
      } else {
        // Return primary identity first, then all others
        const primaryIdentity = identities.find(i => i.isPrimary);
        if (primaryIdentity) {
          responseData = { 
            primary: primaryIdentity,
            identities: identities 
          };
        } else {
          responseData = { identities };
        }
      }
      
      sendFormattedResponse(res, responseData, req);
    } catch (error) {
      console.error("Error fetching identities:", error);
      sendFormattedResponse(res, { message: "Failed to fetch identities" }, req, 500);
    }
  });

  app.get('/api/identities/:id', isAuthenticated, async (req, res) => {
    try {
      const authUser = req.user as any;
      if (!authUser?.claims?.sub) {
        return sendFormattedResponse(res, { message: "Unauthorized" }, req, 401);
      }
      const userId = authUser.claims.sub;
      const { id } = req.params;
      
      const identity = await storage.getIdentity(id, userId);
      if (!identity) {
        return sendFormattedResponse(res, { message: "Identity not found" }, req, 404);
      }
      
      sendFormattedResponse(res, identity, req);
    } catch (error) {
      console.error("Error fetching identity:", error);
      sendFormattedResponse(res, { message: "Failed to fetch identity" }, req, 500);
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

  const updateIdentityHandler = async (req: Request, res: Response) => {
    try {
      const authUser = req.user as any;
      if (!authUser?.claims?.sub) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userId = authUser.claims.sub;
      const { id } = req.params;
      
      console.log(`[${req.method}] /api/identities/${id} - User: ${userId}, Body:`, JSON.stringify(req.body, null, 2));
      
      // Validate request body
      const validation = updateIdentitySchema.safeParse(req.body);
      if (!validation.success) {
        const error = fromZodError(validation.error);
        console.error("Validation error:", error.message);
        return res.status(400).json({ 
          message: "Validation error", 
          details: error.message 
        });
      }

      const updates = validation.data;
      console.log("Validated updates:", JSON.stringify(updates, null, 2));
      
      const identity = await storage.updateIdentity(id, userId, updates);
      
      if (!identity) {
        console.log("Identity not found for id:", id, "userId:", userId);
        return res.status(404).json({ message: "Identity not found" });
      }
      
      console.log("Updated identity:", JSON.stringify(identity, null, 2));
      res.json(identity);
    } catch (error) {
      console.error("Error updating identity:", error);
      res.status(500).json({ message: "Failed to update identity" });
    }
  };

  app.put('/api/identities/:id', isAuthenticated, updateIdentityHandler);
  app.patch('/api/identities/:id', isAuthenticated, updateIdentityHandler);

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
