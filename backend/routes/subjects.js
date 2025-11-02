const express = require('express');
const auth = require('../middleware/auth');
const Subject = require('../models/Subject');
const User = require('../models/User');
const router = express.Router();

// Get all subjects (public for forms)
router.get('/', async (req, res) => {
  try {
    const { department, semester } = req.query;
    const query = {};
    if (department) query.department = department;
    if (semester) query.semester = parseInt(semester);

    const subjects = await Subject.find(query).populate('department');
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create subject (Admin only)
router.post('/', auth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const subject = new Subject(req.body);
    await subject.save();
    res.status(201).json(subject);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Assign subject to faculty (Admin only)
router.post('/assign', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { facultyId, subjectId, semester, class: className } = req.body;

    const faculty = await User.findById(facultyId);
    if (!faculty || (faculty.role !== 'faculty' && faculty.role !== 'hod')) {
      return res.status(400).json({ message: 'Invalid faculty' });
    }

    // Check if already assigned
    const existing = faculty.subjects.find(
      s => s.subject.toString() === subjectId && s.semester === semester && s.class === className
    );

    if (existing) {
      return res.status(400).json({ message: 'Subject already assigned to this faculty' });
    }

    faculty.subjects.push({ subject: subjectId, semester, class: className });
    await faculty.save();

    res.json(faculty);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update subject (Admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const subject = await Subject.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    res.json(subject);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete subject (Admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    res.json({ message: 'Subject deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;


