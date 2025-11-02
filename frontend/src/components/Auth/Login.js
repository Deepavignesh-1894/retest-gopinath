import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';
import { setAuth } from '../../utils/auth';
import './Auth.css';

const Login = () => {
  const [formData, setFormData] = useState({
    uniqueId: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', formData);
      const { token, user } = response.data;
      
      // Store complete user data including departmentAsHod
      setAuth(token, user);
      
      // Determine the correct dashboard route
      let dashboardRoute;
      if (user.role === 'hod') {
        // HOD users always go to HOD dashboard first
        dashboardRoute = '/dashboard/hod';
      } else if (user.role === 'faculty' && user.isClassCounsellor) {
        dashboardRoute = '/dashboard/class-counsellor';
      } else if (user.role === 'faculty') {
        dashboardRoute = '/dashboard/faculty';
      } else if (user.role === 'student') {
        dashboardRoute = '/dashboard/student';
      } else if (user.role === 'dean') {
        dashboardRoute = '/dashboard/dean';
      } else if (user.role === 'admin') {
        dashboardRoute = '/dashboard/admin';
      } else {
        dashboardRoute = '/login';
      }

      navigate(dashboardRoute);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Login to Retest System</h2>
        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label>Unique ID</label>
            <input
              type="text"
              name="uniqueId"
              value={formData.uniqueId}
              onChange={handleChange}
              placeholder="e.g., ITS1"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;