# Retest Application Digitalization System

A complete MERN stack web application for digitalizing the retest application process in colleges. This system automates the approval workflow from student submission to final Dean approval.

## Features

- **Student Portal**: Create retest requests with proof documents and track approval status
- **Faculty Dashboard**: Subject faculty can approve/reject requests
- **Class Counsellor**: Can approve requests for their assigned class
- **HoD Dashboard**: Department Head approval workflow
- **Dean Dashboard**: Final approval authority
- **Admin Portal**: Manage users, departments, subjects, and assign faculty to subjects

## Tech Stack

- **Frontend**: React 19, React Router, Axios
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer for document handling

## Installation & Setup

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the backend directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/retest-app
JWT_SECRET=your-secret-key-change-this-in-production
```

4. Start MongoDB (if running locally):
```bash
# Windows
mongod

# Linux/Mac
sudo systemctl start mongod
```

5. Start the backend server:
```bash
npm run dev
```

The backend server will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the frontend directory (optional):
```env
REACT_APP_API_URL=http://localhost:5000/api
```

4. Start the development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

### Running Both Servers

From the root directory, you can install all dependencies and run both servers:

```bash
# Install root dependencies
npm install

# Install all dependencies
npm run install-all

# Run both servers concurrently
npm run dev
```

## Usage Guide

### Initial Setup (Admin)

1. **Register as Admin**: 
   - Go to `/register`
   - Select role as "Admin"
   - Complete registration

2. **Create Departments**:
   - Login as admin
   - Go to "Departments" tab
   - Create departments (e.g., IT, CS, ECE)

3. **Create Subjects**:
   - Go to "Subjects" tab
   - Add subjects for each semester and department

4. **Assign Subjects to Faculty**:
   - Go to "Subjects" tab
   - Click "Assign to Faculty"
   - Select faculty, subject, semester, and class

5. **Set Up HoD**:
   - Register users with role "HoD"
   - Update their `departmentAsHod` field via API or database

### Student Workflow

1. **Register/Login** as a student
2. **Create Retest Request**:
   - Click "Create Retest Request"
   - Select semester, internal exam, subject
   - Upload proof document (PDF/Image)
   - Submit request

3. **Track Request**:
   - View all requests on dashboard
   - See approval status and current level
   - View proof documents

### Approval Workflow

The approval chain is automatic:

1. **Subject Faculty** (Level 0): Approves if they teach the subject
2. **Class Counsellor** (Level 1): Approves if they counsel that class/semester
3. **HoD** (Level 2): Approves requests from their department
4. **Dean** (Level 3): Final approval authority

### User Roles

- **Student**: Can create and track retest requests
- **Faculty**: Can teach subjects, optionally be class counsellor
- **HoD**: Department head, can teach subjects and approve department requests
- **Dean**: Final approval authority (only one dean)
- **Admin**: Controller of Examinations, manages all data

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Retest Requests
- `GET /api/retests` - Get all requests (filtered by role)
- `GET /api/retests/pending` - Get pending approvals
- `GET /api/retests/:id` - Get single request
- `POST /api/retests` - Create new request (students only)
- `PUT /api/retests/:id/approve` - Approve/reject request
- `PUT /api/retests/:id` - Update request (admin)
- `DELETE /api/retests/:id` - Delete request

### Users
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (admin only)

### Departments
- `GET /api/departments` - Get all departments
- `POST /api/departments` - Create department (admin only)
- `PUT /api/departments/:id` - Update department (admin only)
- `DELETE /api/departments/:id` - Delete department (admin only)

### Subjects
- `GET /api/subjects` - Get all subjects
- `POST /api/subjects` - Create subject (admin only)
- `POST /api/subjects/assign` - Assign subject to faculty (admin only)
- `PUT /api/subjects/:id` - Update subject (admin only)
- `DELETE /api/subjects/:id` - Delete subject (admin only)

## Project Structure

```
Retest-final/
├── backend/
│   ├── models/
│   │   ├── User.js
│   │   ├── Department.js
│   │   ├── Subject.js
│   │   └── RetestRequest.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── retests.js
│   │   ├── departments.js
│   │   └── subjects.js
│   ├── middleware/
│   │   └── auth.js
│   ├── uploads/
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Auth/
│   │   │   ├── Dashboard/
│   │   │   └── Layout/
│   │   ├── utils/
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
└── package.json
```

## Notes

- File uploads are stored in `backend/uploads/proofs/`
- JWT tokens expire in 7 days
- Only one Dean and one Admin can exist in the system
- Faculty can have multiple roles (subject faculty + class counsellor)
- HoD can also teach subjects

## Troubleshooting

1. **MongoDB Connection Error**: Ensure MongoDB is running and connection string is correct
2. **Port Already in Use**: Change PORT in `.env` file
3. **CORS Errors**: Check backend CORS configuration in `server.js`
4. **File Upload Fails**: Ensure `uploads` directory exists in backend

## License

This project is for educational purposes.



