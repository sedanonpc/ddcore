/**
 * Local Development Server for F1 API
 * This runs the serverless functions locally for development
 * On Vercel, these functions will run automatically in the /api directory
 */

import express from 'express';
import cors from 'cors';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for React app
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

app.use(express.json());

// Import the serverless functions
import qualifyingHandler from './api/f1/qualifying.js';
import eventsHandler from './api/f1/events.js';
import availableYearsHandler from './api/f1/available-years.js';

// Import Sportradar functions
import sportradarQualifyingHandler from './api/f1/sportradar-qualifying.js';
import sportradarEventsHandler from './api/f1/sportradar-events.js';
import sportradarInsightsHandler from './api/f1/sportradar-insights.js';
import cacheManagementHandler from './api/f1/cache-management.js';

// Initialize cache system
import { initializeCacheCleanup } from './api/f1/cache.js';
initializeCacheCleanup();

// Route handlers
app.get('/api/f1/qualifying', async (req, res) => {
  try {
    await qualifyingHandler(req, res);
  } catch (error) {
    console.error('Error in qualifying handler:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/f1/events', async (req, res) => {
  try {
    await eventsHandler(req, res);
  } catch (error) {
    console.error('Error in events handler:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/f1/available-years', async (req, res) => {
  try {
    await availableYearsHandler(req, res);
  } catch (error) {
    console.error('Error in available-years handler:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sportradar API routes
app.get('/api/f1/sportradar-qualifying', async (req, res) => {
  try {
    await sportradarQualifyingHandler(req, res);
  } catch (error) {
    console.error('Error in Sportradar qualifying handler:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/f1/sportradar-events', async (req, res) => {
  try {
    await sportradarEventsHandler(req, res);
  } catch (error) {
    console.error('Error in Sportradar events handler:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/f1/sportradar-insights', async (req, res) => {
  try {
    await sportradarInsightsHandler(req, res);
  } catch (error) {
    console.error('Error in Sportradar insights handler:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/f1/cache-management', async (req, res) => {
  try {
    await cacheManagementHandler(req, res);
  } catch (error) {
    console.error('Error in cache management handler:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 F1 API Server running on http://localhost:${PORT}`);
  console.log(`📡 Available endpoints:`);
  console.log(`   GET /api/f1/qualifying`);
  console.log(`   GET /api/f1/events`);
  console.log(`   GET /api/f1/available-years`);
  console.log(`   GET /api/f1/sportradar-qualifying`);
  console.log(`   GET /api/f1/sportradar-events`);
  console.log(`   GET /api/f1/sportradar-insights`);
  console.log(`   GET /api/f1/cache-management`);
  console.log(`   GET /health`);
  console.log(`\n🔗 Your React app should connect to: http://localhost:${PORT}`);
});
