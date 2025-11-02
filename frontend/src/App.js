import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { isAuthenticated, getAuth } from './utils/auth';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import StudentDashboard from './components/Dashboard/StudentDashboard';
import FacultyDashboard from './components/Dashboard/FacultyDashboard';
import ClassCounsellorDashboard from './components/Dashboard/ClassCounsellorDashboard';
import HodDashboard from './components/Dashboard/HodDashboard';
import DeanDashboard from './components/Dashboard/DeanDashboard';
import AdminDashboard from './components/Dashboard/AdminDashboard';
import Layout from './components/Layout/Layout';

const DashboardRedirect = () => {
  const { user } = getAuth();
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    if (!user) return;

    // Redirect HOD from faculty dashboard to HOD dashboard
    if (user.role === 'hod' && location.pathname === '/dashboard/faculty') {
      navigate('/dashboard/hod', { replace: true });
      return;
    }

    // Default dashboard redirects based on role
    const dashboardRoutes = {
      student: '/dashboard/student',
      faculty: '/dashboard/faculty',
      hod: '/dashboard/hod',
      dean: '/dashboard/dean',
      admin: '/dashboard/admin'
    };

    const defaultRoute = dashboardRoutes[user.role] || '/login';
    if (location.pathname === '/dashboard') {
      navigate(defaultRoute, { replace: true });
    }
  }, [user, location.pathname, navigate]);

  return null;
};

const PrivateRoute = ({ children }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" />;
  }
  return (
    <>
      <DashboardRedirect />
      {children}
    </>
  );
};

const RoleRoute = ({ children, allowedRoles }) => {
  const { user } = getAuth();
  
  if (!user || !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role
    const roleDashboards = {
      student: '/dashboard/student',
      faculty: '/dashboard/faculty',
      hod: '/dashboard/hod',
      dean: '/dashboard/dean',
      admin: '/dashboard/admin'
    };
    
    return <Navigate to={roleDashboards[user?.role] || '/login'} />;
  }
  
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route path="/dashboard" element={<PrivateRoute><DashboardRedirect /></PrivateRoute>} />
        
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
              <RoleRoute allowedRoles={['faculty']}>
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
        
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}

export default App;