import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';
import { setAuth } from '../../utils/auth';
import './Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    uniqueId: '',
    name: '',
    email: '',
    password: '',
    role: 'student',
    class: '',
    year: '',
    semester: '',
    department: '',
    isClassCounsellor: false,
    counsellorClass: '',
    counsellorSemester: '',
    departmentAsHod: ''
  });
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.data);
    } catch (err) {
      console.error('Error loading departments:', err);
    }
  };

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const submitData = { ...formData };
      if (submitData.year) submitData.year = parseInt(submitData.year);
      if (submitData.semester) submitData.semester = parseInt(submitData.semester);
      if (submitData.counsellorSemester) submitData.counsellorSemester = parseInt(submitData.counsellorSemester);
      
      // Clean empty fields
      if (!submitData.department) delete submitData.department;
      if (!submitData.departmentAsHod) delete submitData.departmentAsHod;
      if (!submitData.class) delete submitData.class;
      if (!submitData.counsellorClass) delete submitData.counsellorClass;

      const response = await api.post('/auth/register', submitData);
      setAuth(response.data.token, response.data.user);
      
      // Redirect based on role
      const role = response.data.user.role;
      if (role === 'student') navigate('/dashboard/student');
      else if (role === 'faculty' || role === 'hod') navigate('/dashboard/faculty');
      else if (role === 'hod') navigate('/dashboard/hod');
      else if (role === 'dean') navigate('/dashboard/dean');
      else if (role === 'admin') navigate('/dashboard/admin');
      else navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card register-card">
        <h2>Register for Retest System</h2>
        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label>Unique ID *</label>
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
            <label>Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Password *</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              minLength="6"
              required
            />
          </div>

          <div className="form-group">
            <label>Role *</label>
            <select name="role" value={formData.role} onChange={handleChange} required>
              <option value="student">Student</option>
              <option value="faculty">Faculty</option>
              <option value="hod">HoD</option>
              <option value="dean">Dean</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {formData.role === 'student' && (
            <>
              <div className="form-group">
                <label>Department</label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept._id} value={dept._id}>{dept.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Class</label>
                <input
                  type="text"
                  name="class"
                  value={formData.class}
                  onChange={handleChange}
                  placeholder="e.g., IT-A"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Year</label>
                  <input
                    type="number"
                    name="year"
                    value={formData.year}
                    onChange={handleChange}
                    min="1"
                    max="4"
                  />
                </div>
                <div className="form-group">
                  <label>Semester</label>
                  <input
                    type="number"
                    name="semester"
                    value={formData.semester}
                    onChange={handleChange}
                    min="1"
                    max="8"
                  />
                </div>
              </div>
            </>
          )}

          {(formData.role === 'faculty' || formData.role === 'hod') && (
            <>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    name="isClassCounsellor"
                    checked={formData.isClassCounsellor}
                    onChange={handleChange}
                  />
                  Class Counsellor
                </label>
              </div>
              {formData.isClassCounsellor && (
                <>
                  <div className="form-group">
                    <label>Counsellor Class</label>
                    <input
                      type="text"
                      name="counsellorClass"
                      value={formData.counsellorClass}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Counsellor Semester</label>
                    <input
                      type="number"
                      name="counsellorSemester"
                      value={formData.counsellorSemester}
                      onChange={handleChange}
                      min="1"
                      max="8"
                    />
                  </div>
                </>
              )}
            </>
          )}

          {formData.role === 'hod' && (
            <div className="form-group">
              <label>Department (as HoD) - Enter Department ID</label>
              <input
                type="text"
                name="departmentAsHod"
                value={formData.departmentAsHod}
                onChange={handleChange}
                placeholder="Will be set by admin after department creation"
              />
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;


