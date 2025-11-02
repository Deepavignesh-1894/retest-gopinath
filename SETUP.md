# Quick Setup Guide

## Prerequisites
- Node.js (v14+)
- MongoDB installed and running

## Step-by-Step Setup

### 1. Install Dependencies

```bash
# Install root dependencies (for running both servers)
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Setup MongoDB

Make sure MongoDB is running:

**Windows:**
```bash
mongod
```

**Linux/Mac:**
```bash
sudo systemctl start mongod
# or
brew services start mongodb-community
```

### 3. Configure Environment

Backend `.env` file is already created with defaults:
- PORT=5000
- MONGODB_URI=mongodb://localhost:27017/retest-app
- JWT_SECRET=retest-app-secret-key-2024

### 4. Start the Application

**Option 1: Run both servers together (from root directory)**
```bash
npm run dev
```

**Option 2: Run servers separately**

Terminal 1 (Backend):
```bash
cd backend
npm run dev
```

Terminal 2 (Frontend):
```bash
cd frontend
npm start
```

### 5. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api

## Initial Setup Workflow

1. **Register as Admin**
   - Go to http://localhost:3000/register
   - Select role: "Admin"
   - Fill in details and register

2. **Create Departments** (as Admin)
   - Login and go to "Departments" tab
   - Create departments (e.g., IT, CS, ECE)

3. **Create Subjects** (as Admin)
   - Go to "Subjects" tab
   - Add subjects for each semester

4. **Register Users**
   - Students: Register with role "Student", select department
   - Faculty: Register with role "Faculty", optionally check "Class Counsellor"
   - HoD: Register with role "HoD"
   - Dean: Register with role "Dean" (only one allowed)

5. **Assign Subjects to Faculty** (as Admin)
   - Go to "Subjects" tab
   - Click "Assign to Faculty"
   - Select faculty, subject, semester, and class

6. **Set HoD Department** (Admin via API or database)
   - Update user's `departmentAsHod` field to point to their department ID

## Testing the Workflow

1. **Student creates retest request**
   - Login as student
   - Click "Create Retest Request"
   - Fill form and upload proof document
   - Submit

2. **Approval Chain**
   - Subject Faculty approves (Level 0 → 1)
   - Class Counsellor approves (Level 1 → 2)
   - HoD approves (Level 2 → 3)
   - Dean approves (Level 3 → 4, Final)

3. **Admin schedules retest**
   - Login as admin
   - View approved requests
   - Set scheduled date
   - Mark as completed after retest

## Troubleshooting

**MongoDB Connection Error:**
- Ensure MongoDB is running
- Check connection string in backend/.env

**Port Already in Use:**
- Change PORT in backend/.env
- Or kill process using the port

**CORS Errors:**
- Backend CORS is configured for localhost:3000
- Check frontend .env for correct API URL

**File Upload Issues:**
- Ensure `backend/uploads` directory exists
- Check file permissions

## Default Test Data

You can create test users with these roles:
- Student: uniqueId: "STU001", role: "student"
- Faculty: uniqueId: "FAC001", role: "faculty"
- HoD: uniqueId: "HOD001", role: "hod"
- Dean: uniqueId: "DEAN001", role: "dean"
- Admin: uniqueId: "ADMIN001", role: "admin"



