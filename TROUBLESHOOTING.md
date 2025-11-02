# Troubleshooting Guide

## Common Issues and Solutions

### 1. 500 Internal Server Error on Login/Register

**Symptoms:**
- `POST http://localhost:5000/api/auth/login 500 (Internal Server Error)`
- Server crashes or returns 500 errors

**Solutions:**

#### Check 1: Ensure .env file exists
- The `.env` file must exist in the `backend/` directory
- Should contain:
  ```
  PORT=5000
  MONGODB_URI=mongodb://localhost:27017/retest-app
  JWT_SECRET=retest-app-secret-key-2024
  ```

#### Check 2: MongoDB is Running
- Open MongoDB Compass and verify you can connect
- Or check if MongoDB service is running:
  ```bash
  # Windows
  net start MongoDB
  
  # Check in Task Manager if mongod.exe is running
  ```

#### Check 3: Backend Server is Running
- Make sure backend server is started:
  ```bash
  cd backend
  npm run dev
  ```
- You should see:
  ```
  ✅ MongoDB Connected successfully
  🚀 Server running on port 5000
  ```

#### Check 4: Check Backend Console for Errors
- Look at the terminal where backend is running
- Common errors:
  - `MongoDB Connection Error` - MongoDB not running
  - `JWT_SECRET is not configured` - .env file missing or not loaded
  - `Cannot find module` - Dependencies not installed

### 2. 404 Not Found Errors

**Symptoms:**
- `Failed to load resource: the server responded with a status of 404`

**Solutions:**
- Ensure backend server is running on port 5000
- Check that routes are registered in `server.js`
- Verify API URL in frontend is `http://localhost:5000/api`

### 3. CORS Errors

**Symptoms:**
- `Access to XMLHttpRequest has been blocked by CORS policy`

**Solutions:**
- CORS is already configured in `server.js`
- Ensure backend is running
- Check that frontend is accessing the correct API URL

### 4. MongoDB Connection Issues

**Symptoms:**
- `MongoDB Connection Error` in console
- Database operations fail

**Solutions:**
- Start MongoDB service
- Check connection string in `.env` file
- Verify MongoDB Compass can connect to `mongodb://localhost:27017`
- Try creating database manually in Compass: `retest-app`

### 5. Dependencies Not Installed

**Symptoms:**
- `Cannot find module 'express'` or similar errors

**Solutions:**
```bash
cd backend
npm install

cd ../frontend
npm install
```

### 6. Port Already in Use

**Symptoms:**
- `Error: listen EADDRINUSE: address already in use :::5000`

**Solutions:**
- Kill the process using port 5000:
  ```bash
  # Windows
  netstat -ano | findstr :5000
  taskkill /PID <PID> /F
  
  # Or change PORT in backend/.env
  ```

### 7. Frontend Can't Connect to Backend

**Symptoms:**
- Network errors in browser console
- "Failed to fetch" errors

**Solutions:**
- Verify backend is running (check terminal)
- Check backend URL in `frontend/src/utils/api.js`
- Ensure no firewall blocking port 5000
- Try accessing `http://localhost:5000/api/auth/login` directly in browser (should show error, not connection refused)

## Step-by-Step Debugging

1. **Check Backend Status:**
   ```bash
   cd backend
   npm run dev
   ```
   Should see MongoDB connected and server running messages

2. **Check MongoDB:**
   - Open MongoDB Compass
   - Connect to `mongodb://localhost:27017`
   - Verify you can see/create databases

3. **Test API Endpoint:**
   - Open browser
   - Go to `http://localhost:5000/api/auth/login`
   - Should see error (not 404) - this confirms server is running

4. **Check Frontend:**
   - Open browser console (F12)
   - Look for specific error messages
   - Check Network tab to see what request is failing

5. **Check .env File:**
   ```bash
   cd backend
   # Verify .env exists and has content
   cat .env  # Linux/Mac
   type .env # Windows PowerShell
   ```

## Quick Fixes

If nothing works, try this reset:

```bash
# 1. Stop all servers (Ctrl+C)

# 2. Reinstall dependencies
cd backend
rm -rf node_modules  # or del /s node_modules on Windows
npm install

cd ../frontend
rm -rf node_modules
npm install

# 3. Verify .env exists in backend/
# 4. Start MongoDB
# 5. Start backend: cd backend && npm run dev
# 6. Start frontend: cd frontend && npm start
```

## Getting Help

When asking for help, provide:
1. Error message from browser console
2. Error message from backend terminal
3. Contents of `backend/.env` (without sensitive data)
4. MongoDB connection status
5. Node.js version: `node -v`



