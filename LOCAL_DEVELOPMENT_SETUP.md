# 🚀 Local Development Setup for F1 API

## The Problem
Your React app (Create React App) can't use the `/api` directory locally - that only works on Vercel. We need a local development server.

## ✅ Solution: Local Development Server

### Step 1: Install Dependencies
```bash
# Install the required packages for the development server
npm install express cors
```

### Step 2: Start the F1 API Server
```bash
# Start the F1 API server (runs on port 3001)
node server.js
```

### Step 3: Start Your React App
```bash
# In another terminal, start your React app (runs on port 3000)
npm start
```

### Step 4: Test Everything Works
```bash
# Test the F1 API (in another terminal)
node test-serverless-f1.js
```

## 🎯 How It Works

### Local Development (What you're doing now):
- **F1 API Server**: `http://localhost:3001` (Express server)
- **React App**: `http://localhost:3000` (Your main app)
- **Component**: Calls `http://localhost:3001/api/f1/qualifying`

### Vercel Deployment (Production):
- **React App**: `https://your-app.vercel.app`
- **API Functions**: `https://your-app.vercel.app/api/f1/qualifying` (automatic)
- **Component**: Calls `/api/f1/qualifying` (relative path)

## 🔧 Quick Start Commands

```bash
# Terminal 1: Start F1 API server
node server.js

# Terminal 2: Start React app  
npm start

# Terminal 3: Test the API
node test-serverless-f1.js
```

## 🎉 Expected Results

When everything is working, you should see:

1. **F1 API Server**: `🚀 F1 API Server running on http://localhost:3001`
2. **React App**: Opens in browser at `http://localhost:3000`
3. **Test Script**: Shows successful API calls and qualifying results
4. **F1 Component**: Displays qualifying results in your app

## 🚨 Troubleshooting

### If you get "Cannot find module 'express'":
```bash
npm install express cors
```

### If you get "Port 3001 already in use":
```bash
# Kill any process using port 3001
npx kill-port 3001
# Then restart: node server.js
```

### If the React app can't connect:
- Make sure the F1 API server is running on port 3001
- Check the browser console for errors
- Verify the component is calling `http://localhost:3001/api/f1/qualifying`

## 🚀 Ready for Vercel!

Once this works locally, your app will work perfectly on Vercel because:
- The `/api` directory will automatically become serverless functions
- The component will use relative paths (`/api/f1/qualifying`)
- No separate server needed!
