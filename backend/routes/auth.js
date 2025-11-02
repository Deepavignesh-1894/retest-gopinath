const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Register
router.post('/register', async (req, res) => {
  try {
    const { uniqueId, name, email, password, role, class: className, year, semester, department, isClassCounsellor, counsellorClass, counsellorSemester, departmentAsHod } = req.body;

    if (!uniqueId || !name || !email || !password || !role) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured');
    }

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ uniqueId }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this ID or email already exists' });
    }

    // Check role-specific constraints
    if (role === 'dean') {
      const existingDean = await User.findOne({ role: 'dean' });
      if (existingDean) {
        return res.status(400).json({ message: 'Dean already exists' });
      }
    }

    if (role === 'admin') {
      const existingAdmin = await User.findOne({ role: 'admin' });
      if (existingAdmin) {
        return res.status(400).json({ message: 'Admin already exists' });
      }
    }

    const user = new User({
      uniqueId,
      name,
      email,
      password,
      role,
      class: className,
      year,
      semester,
      department,
      isClassCounsellor,
      counsellorClass,
      counsellorSemester,
      departmentAsHod
    });

    await user.save();

    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        uniqueId: user.uniqueId,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { uniqueId, password } = req.body;

    if (!uniqueId || !password) {
      return res.status(400).json({ message: 'Unique ID and password are required' });
    }

    const user = await User.findOne({ uniqueId })
      .populate('department departmentAsHod subjects.subject');
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured');
    }

    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        id: user._id,
        uniqueId: user.uniqueId,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        departmentAsHod: user.departmentAsHod,
        isClassCounsellor: user.isClassCounsellor,
        counsellorClass: user.counsellorClass,
        counsellorSemester: user.counsellorSemester,
        class: user.class,
        year: user.year,
        semester: user.semester,
        subjects: user.subjects || []
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message || 'Internal server error during login' });
  }
});

// Get current user
router.get('/me', require('../middleware/auth'), async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('department')
      .populate('departmentAsHod')
      .populate('subjects.subject');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Add specific check for HOD role
    if (user.role === 'hod' && !user.departmentAsHod) {
      return res.status(403).json({
        message: 'HOD department not assigned. Please contact the administrator.',
        user: {
          role: user.role,
          name: user.name,
          departmentAsHod: null
        }
      });
    }

    res.json(user);
  } catch (error) {
    console.error('Error in /me route:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;


