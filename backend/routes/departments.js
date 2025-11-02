const express = require('express');
const auth = require('../middleware/auth');
const Department = require('../models/Department');
const User = require('../models/User');
const router = express.Router();

// Get all departments (public for registration)
router.get('/', async (req, res) => {
  try {
    const departments = await Department.find().populate('hod');
    res.json(departments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create department (Admin only)
router.post('/', auth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const department = new Department(req.body);
    await department.save();
    // If a hod was provided, update the corresponding user record
    if (department.hod) {
      try {
        await User.findByIdAndUpdate(department.hod, { departmentAsHod: department._id });
      } catch (e) {
        console.error('Failed to assign departmentAsHod to user:', e);
      }
    }
    res.status(201).json(department);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update department (Admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Load existing department to compare HOD changes
    const existing = await Department.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Department not found' });

    const oldHod = existing.hod ? existing.hod.toString() : null;
    const newHod = req.body.hod ? req.body.hod.toString() : null;

    const department = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true });

    // If HOD changed, update user records accordingly
    if (oldHod && oldHod !== newHod) {
      try {
        await User.findByIdAndUpdate(oldHod, { $unset: { departmentAsHod: '' } });
      } catch (e) {
        console.error('Failed to unset previous HOD user:', e);
      }
    }
    if (newHod && oldHod !== newHod) {
      try {
        await User.findByIdAndUpdate(newHod, { departmentAsHod: department._id });
      } catch (e) {
        console.error('Failed to set new HOD user:', e);
      }
    }

    res.json(department);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete department (Admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Find department to determine current HOD
    const department = await Department.findById(req.params.id);
    if (!department) return res.status(404).json({ message: 'Department not found' });

    // If department had an HOD, unset their departmentAsHod
    if (department.hod) {
      try {
        await User.findByIdAndUpdate(department.hod, { $unset: { departmentAsHod: '' } });
      } catch (e) {
        console.error('Failed to unset HOD on department delete:', e);
      }
    }

    await Department.findByIdAndDelete(req.params.id);
    res.json({ message: 'Department deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;


