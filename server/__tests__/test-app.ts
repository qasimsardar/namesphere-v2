import express from "express";
import { registerRoutes } from "../routes";
import type { Express } from 'express';

// Create test Express app without Vite setup
export const createTestApp = async (): Promise<Express> => {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  
  // Set environment to test to prevent Vite initialization
  app.set('env', 'test');
  
  // Register routes but don't start the server
  await registerRoutes(app);
  
  return app;
};