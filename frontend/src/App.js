import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { isAuthenticated } from './utils/auth';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import StudentDashboard from './components/Dashboard/StudentDashboard';
import FacultyDashboard from './components/Dashboard/FacultyDashboard';
import ClassCounsellorDashboard from './components/Dashboard/ClassCounsellorDashboard';
import HodDashboard from './components/Dashboard/HodDashboard';
import DeanDashboard from './components/Dashboard/DeanDashboard';
import AdminDashboard from './components/Dashboard/AdminDashboard';
import Layout from './components/Layout/Layout';

const PrivateRoute = ({ children }) => {
  return isAuthenticated() ? children : <Navigate to="/login" />;
};

const RoleRoute = ({ children, allowedRoles }) => {
  const { user } = require('./utils/auth').getAuth();
  
  if (!isAuthenticated()) {
    return <Navigate to="/login" />;
  }
  
  if (allowedRoles.includes(user?.role)) {
    return children;
  }
  
  // Redirect to appropriate dashboard
  const roleDashboards = {
    student: '/dashboard/student',
    faculty: '/dashboard/faculty',
    hod: '/dashboard/hod',
    dean: '/dashboard/dean',
    admin: '/dashboard/admin'
  };
  
  return <Navigate to={roleDashboards[user?.role] || '/login'} />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route
          path="/dashboard/student"
          element={
            <PrivateRoute>
              <RoleRoute allowedRoles={['student']}>
                <Layout>
                  <StudentDashboard />
                </Layout>
              </RoleRoute>
            </PrivateRoute>
          }
        />
        
        <Route
          path="/dashboard/faculty"
          element={
            <PrivateRoute>
              <RoleRoute allowedRoles={['faculty', 'hod']}>
                <Layout>
                  <FacultyDashboard />
                </Layout>
              </RoleRoute>
            </PrivateRoute>
          }
        />
        
        <Route
          path="/dashboard/class-counsellor"
          element={
            <PrivateRoute>
              <RoleRoute allowedRoles={['faculty', 'hod']}>
                <Layout>
                  <ClassCounsellorDashboard />
                </Layout>
              </RoleRoute>
            </PrivateRoute>
          }
        />
        
        <Route
          path="/dashboard/hod"
          element={
            <PrivateRoute>
              <RoleRoute allowedRoles={['hod']}>
                <Layout>
                  <HodDashboard />
                </Layout>
              </RoleRoute>
            </PrivateRoute>
          }
        />
        
        <Route
          path="/dashboard/dean"
          element={
            <PrivateRoute>
              <RoleRoute allowedRoles={['dean']}>
                <Layout>
                  <DeanDashboard />
                </Layout>
              </RoleRoute>
            </PrivateRoute>
          }
        />
        
        <Route
          path="/dashboard/admin"
          element={
            <PrivateRoute>
              <RoleRoute allowedRoles={['admin']}>
                <Layout>
                  <AdminDashboard />
                </Layout>
              </RoleRoute>
            </PrivateRoute>
          }
        />
        
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
