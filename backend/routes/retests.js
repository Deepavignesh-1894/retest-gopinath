const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const RetestRequest = require('../models/RetestRequest');
const User = require('../models/User');
const Subject = require('../models/Subject');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/proofs';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'proof-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Create retest request
router.post('/', auth, upload.single('proofDocument'), async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can create retest requests' });
    }

    const { semester, internal, subject } = req.body;

    const subjectDoc = await Subject.findById(subject);
    if (!subjectDoc) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    // Find subject faculty
    const faculty = await User.findOne({
      role: { $in: ['faculty', 'hod'] },
      'subjects.subject': subject,
      'subjects.semester': parseInt(semester),
      'subjects.class': req.user.class
    });

    if (!faculty) {
      return res.status(404).json({ message: 'Subject faculty not assigned for this subject' });
    }

    const retestRequest = new RetestRequest({
      student: req.user._id,
      studentName: req.user.name,
      class: req.user.class,
      year: req.user.year,
      semester: parseInt(semester),
      internal: parseInt(internal),
      subject: subject,
      subjectName: subjectDoc.name,
      proofDocument: req.file ? req.file.path : '',
      levelOfApproval: 0
    });

    await retestRequest.save();
    res.status(201).json(retestRequest);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get all retest requests (for admin)
router.get('/', auth, async (req, res) => {
  try {
    let query = {};

    // Students can only see their own requests
    if (req.user.role === 'student') {
      query.student = req.user._id;
    }
    // Class Counsellor sees both subject requests AND class requests
    else if (req.user.isClassCounsellor) {
      const orConditions = [];
      
      // Subject requests (if they teach subjects)
      if (req.user.subjects && req.user.subjects.length > 0) {
        const subjectIds = req.user.subjects.map(s => s.subject.toString());
        orConditions.push({ subject: { $in: subjectIds } });
      }
      
      // Class requests
      orConditions.push({
        class: req.user.counsellorClass,
        semester: parseInt(req.user.counsellorSemester)
      });
      
      // If also HoD, add department requests (all levels for students in their department)
      if (req.user.role === 'hod') {
        const hodDept = req.user.departmentAsHod;
        if (hodDept) {
          const deptId = hodDept instanceof mongoose.Types.ObjectId 
            ? hodDept 
            : new mongoose.Types.ObjectId(hodDept._id || hodDept);
          const studentIds = await User.find({ department: deptId }).distinct('_id');
          if (studentIds.length > 0) {
            orConditions.push({ student: { $in: studentIds } });
          }
        }
      }
      
      if (orConditions.length > 0) {
        query.$or = orConditions;
      } else {
        query._id = null; // No conditions, return empty
      }
    }
    // HoD sees requests from their department (all levels) AND their subject requests
    else if (req.user.role === 'hod') {
      const orConditions = [];
      const hodDept = req.user.departmentAsHod;
      
      // Department requests (all levels for students in their department)
      if (hodDept) {
        const deptId = hodDept instanceof mongoose.Types.ObjectId 
          ? hodDept 
          : new mongoose.Types.ObjectId(hodDept._id || hodDept);
        const studentIds = await User.find({ department: deptId }).distinct('_id');
        if (studentIds.length > 0) {
          orConditions.push({ student: { $in: studentIds } });
        }
      }
      
      // Subject requests (if HoD teaches subjects)
      if (req.user.subjects && req.user.subjects.length > 0) {
        const subjectIds = req.user.subjects.map(s => s.subject.toString());
        orConditions.push({ subject: { $in: subjectIds } });
      }
      
      if (orConditions.length > 0) {
        query.$or = orConditions;
      } else {
        query._id = null; // No conditions, return empty
      }
    }
    // Faculty see requests for their subjects only (not CC, not HoD)
    else if (req.user.role === 'faculty') {
      // Get subject IDs assigned to this faculty
      if (req.user.subjects && req.user.subjects.length > 0) {
        const subjectIds = req.user.subjects.map(s => s.subject.toString());
        query.subject = { $in: subjectIds };
      } else {
        query._id = null; // No subjects, return empty
      }
    }
    // Dean sees all pending requests at their level
    else if (req.user.role === 'dean') {
      query.levelOfApproval = 3;
    }
    // Admin sees all
    // No filter for admin

    const requests = await RetestRequest.find(query)
      .populate('student', 'uniqueId name class year semester')
      .populate('subject')
      .populate('approvals.subjectFaculty.approvedBy', 'name uniqueId')
      .populate('approvals.classCounsellor.approvedBy', 'name uniqueId')
      .populate('approvals.hod.approvedBy', 'name uniqueId')
      .populate('approvals.dean.approvedBy', 'name uniqueId')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get pending approvals for current user
router.get('/pending', auth, async (req, res) => {
  try {
    let query = { status: 'pending' };

    if (req.user.role === 'student') {
      query.student = req.user._id;
    } else if (req.user.role === 'hod') {
      // Highest priority: HoD view
      // Restore per-department filtering with class-initials fallback
      const hodDeptObj = req.user.departmentAsHod;
      if (hodDeptObj) {
        const deptId = hodDeptObj instanceof mongoose.Types.ObjectId
          ? hodDeptObj
          : new mongoose.Types.ObjectId(hodDeptObj._id || hodDeptObj);
        const studentIds = await User.find({ department: deptId }).distinct('_id');
        const deptName = (hodDeptObj.name || '').trim();
        const initials = deptName.split(/\s+/).map(w => w[0] || '').join('').toUpperCase();
        const classRegex = initials ? new RegExp(`^${initials}\\s+`, 'i') : null;

        const orList = [];
        if (studentIds.length > 0) {
          orList.push({ levelOfApproval: 2, student: { $in: studentIds } });
        }
        if (classRegex) {
          orList.push({ levelOfApproval: 2, class: { $regex: classRegex } });
        }
        if (orList.length > 0) {
          query = { status: 'pending', $or: orList };
        } else {
          query._id = null; // No conditions will yield empty
        }
      } else {
        query._id = null;
      }
    } else if (req.user.isClassCounsellor) {
      // Class counsellor can see requests at level 1 for their class and semester
      // Note: This can overlap with HoD role, so we handle it separately
      const ccSemester = parseInt(req.user.counsellorSemester);
      const ccClass = req.user.counsellorClass;
      
      console.log('Class Counsellor query:', {
        counsellorClass: ccClass,
        counsellorSemester: ccSemester,
        levelOfApproval: 1
      });
      
      const ccConditions = {
        levelOfApproval: 1,
        class: ccClass,
        semester: ccSemester
      };
      
      // If also HoD, TEMP UNBLOCK: show all level 2 pending (ignore department filter)
      if (req.user.role === 'hod') {
        query = { status: 'pending', levelOfApproval: 2 };
      } else {
        // Just Class Counsellor (not HoD)
        query.levelOfApproval = 1;
        query.class = ccClass;
        query.semester = ccSemester;
        
        console.log('Class Counsellor query (not HoD):', query);
      }
    } else if (req.user.role === 'hod') {
      // EMERGENCY UNBLOCK: HoD sees all pending requests, will filter to level 2 after fetch
      // Keep only status: 'pending' (already set at top). Do not add more DB filters here.
    } else if (req.user.role === 'faculty') {
      // Pure faculty (not HoD, not class counsellor) - only subject requests at level 0
      query.levelOfApproval = 0;
      
      // Build query to match subject, semester, and class for at least one assignment
      if (req.user.subjects && req.user.subjects.length > 0) {
        const subjectMatches = req.user.subjects.map(s => ({
          subject: s.subject instanceof mongoose.Types.ObjectId ? s.subject : new mongoose.Types.ObjectId(s.subject),
          semester: s.semester,
          class: s.class
        }));
        
        // Match requests where subject, semester, and class all match at least one assignment
        query.$or = subjectMatches.map(match => ({
          subject: match.subject,
          semester: match.semester,
          class: match.class
        }));
      } else {
        // If no subjects assigned, return empty result
        query._id = null; // This will return no results
      }
    } else if (req.user.role === 'dean') {
      query.levelOfApproval = 3;
    }

    const requests = await RetestRequest.find(query)
      .populate('student', 'uniqueId name class year semester department')
      .populate('subject')
      .sort({ createdAt: -1 });

    // Debug: Log counts for HoD and CC
    if (req.user.role === 'hod') {
      console.log(`[HoD Pending] dept=`, req.user.departmentAsHod && req.user.departmentAsHod.name, ` count=`, requests.length);
    } else if (req.user.isClassCounsellor) {
      console.log(`[CC Pending] class=`, req.user.counsellorClass, ` sem=`, req.user.counsellorSemester, ` count=`, requests.length);
    }

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single retest request
router.get('/:id', auth, async (req, res) => {
  try {
    const request = await RetestRequest.findById(req.params.id)
      .populate('student', 'uniqueId name class year semester')
      .populate('subject')
      .populate('approvals.subjectFaculty.approvedBy', 'name uniqueId')
      .populate('approvals.classCounsellor.approvedBy', 'name uniqueId')
      .populate('approvals.hod.approvedBy', 'name uniqueId')
      .populate('approvals.dean.approvedBy', 'name uniqueId');

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Check access permissions
    if (req.user.role === 'student' && request.student._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Approve/Reject retest request
router.put('/:id/approve', auth, async (req, res) => {
  try {
    const { approved, comments, scheduledDate } = req.body;
    const request = await RetestRequest.findById(req.params.id)
      .populate('student', 'department class semester')
      .populate('subject');

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request is not pending' });
    }

    let updateData = {};
    const student = request.student;

    // Handle approval based on user role and current level
    // Order matters: check by level (0 -> 1 -> 2 -> 3) to handle users with multiple roles
    
    // Level 0: Subject Faculty approval
    if (request.levelOfApproval === 0 && (req.user.role === 'faculty' || req.user.role === 'hod')) {
      const requestSubjectId = request.subject._id?.toString() || request.subject.toString();
      const requestSemester = parseInt(request.semester);
      const requestClass = request.class;
      
      // Check if user teaches this subject for the same semester and class
      const canApproveAsSubjectFaculty = req.user.subjects?.some(s => {
        const subjId = s.subject?._id?.toString() || s.subject?.toString();
        const subjSemester = parseInt(s.semester);
        const subjClass = s.class;
        return subjId === requestSubjectId && 
               subjSemester === requestSemester && 
               subjClass === requestClass;
      }) || false;
      
      if (canApproveAsSubjectFaculty) {
        // Subject faculty approval
        updateData['approvals.subjectFaculty.approved'] = approved;
        updateData['approvals.subjectFaculty.approvedBy'] = req.user._id;
        updateData['approvals.subjectFaculty.approvedAt'] = new Date();
        updateData['approvals.subjectFaculty.comments'] = comments || '';
        updateData['approvals.subjectFaculty.rejected'] = !approved;
        
        if (approved) {
          updateData.levelOfApproval = 1;
          console.log(`Subject Faculty approved: Moving from Level 0 to Level 1`);
        } else {
          updateData.status = 'rejected';
        }
      } else {
        return res.status(403).json({ message: 'You are not authorized to approve this request. You must be the assigned subject faculty for this subject, semester, and class.' });
      }
    }
    // Level 1: Class Counsellor approval (check this before HoD level 2)
    else if (request.levelOfApproval === 1 && req.user.isClassCounsellor) {
      const requestSemester = parseInt(request.semester);
      const counsellorSemester = parseInt(req.user.counsellorSemester);
      
      if (request.class === req.user.counsellorClass && requestSemester === counsellorSemester) {
        updateData['approvals.classCounsellor.approved'] = approved;
        updateData['approvals.classCounsellor.approvedBy'] = req.user._id;
        updateData['approvals.classCounsellor.approvedAt'] = new Date();
        updateData['approvals.classCounsellor.comments'] = comments || '';
        updateData['approvals.classCounsellor.rejected'] = !approved;
        
        if (approved) {
          updateData.levelOfApproval = 2;
          console.log(`Class Counsellor approved: Moving from Level 1 to Level 2`);
        } else {
          updateData.status = 'rejected';
        }
      } else {
        return res.status(403).json({ message: 'Access denied. You are not the Class Counsellor for this class and semester.' });
      }
    }
    // Level 2: HoD approval
    else if (request.levelOfApproval === 2 && req.user.role === 'hod') {
      const studentDept = student.department?.toString();
      const hodDeptObj = req.user.departmentAsHod;
      const hodDept = hodDeptObj?._id ? hodDeptObj._id.toString() : hodDeptObj?.toString();

      // Fallback: if student's department not set or ids don't match, allow match via class prefix (e.g., IT A for Information Technology)
      const deptName = hodDeptObj && hodDeptObj.name ? hodDeptObj.name : '';
      const initials = deptName ? deptName.trim().split(/\s+/).map(w => w[0] || '').join('').toUpperCase() : '';
      const classMatchesDept = initials && typeof request.class === 'string' 
        ? new RegExp(`^${initials}\\s+`, 'i').test(request.class)
        : false;

      if ((studentDept && hodDept && studentDept === hodDept) || (!studentDept && classMatchesDept) || (!hodDept && classMatchesDept) || classMatchesDept) {
        updateData['approvals.hod.approved'] = approved;
        updateData['approvals.hod.approvedBy'] = req.user._id;
        updateData['approvals.hod.approvedAt'] = new Date();
        updateData['approvals.hod.comments'] = comments || '';
        updateData['approvals.hod.rejected'] = !approved;
        
        if (approved) {
          updateData.levelOfApproval = 3;
          console.log(`HoD approved: Moving from Level 2 to Level 3`);
        } else {
          updateData.status = 'rejected';
        }
      } else {
        return res.status(403).json({ message: 'Access denied. Student is not in your department.' });
      }
    }
    // Level 3: Dean approval (final)
    else if (request.levelOfApproval === 3 && req.user.role === 'dean') {
      // Dean approval (final)
      updateData['approvals.dean.approved'] = approved;
      updateData['approvals.dean.approvedBy'] = req.user._id;
      updateData['approvals.dean.approvedAt'] = new Date();
      updateData['approvals.dean.comments'] = comments || '';
      updateData['approvals.dean.rejected'] = !approved;
      
      if (approved) {
        updateData.levelOfApproval = 4;
        updateData.status = 'approved';
        if (scheduledDate) {
          updateData.scheduledDate = scheduledDate;
        }
        console.log(`Dean approved: Moving from Level 3 to Level 4 (Final Approval)`);
      } else {
        updateData.status = 'rejected';
      }
    } else {
      return res.status(403).json({ message: 'You are not authorized to approve this request' });
    }

    // Ensure updatedAt is also updated
    updateData.updatedAt = new Date();
    
    // Use $set operator to ensure all fields are updated correctly
    const updateQuery = { $set: updateData };
    
    console.log('Update query:', JSON.stringify(updateQuery, null, 2));
    
    const updatedRequest = await RetestRequest.findByIdAndUpdate(
      req.params.id,
      updateQuery,
      { new: true, runValidators: true }
    )
    .populate('student', 'uniqueId name class year semester department')
    .populate('subject')
    .populate('approvals.subjectFaculty.approvedBy', 'name uniqueId')
    .populate('approvals.classCounsellor.approvedBy', 'name uniqueId')
    .populate('approvals.hod.approvedBy', 'name uniqueId')
    .populate('approvals.dean.approvedBy', 'name uniqueId');

    if (!updatedRequest) {
      return res.status(404).json({ message: 'Request not found after update' });
    }

    console.log(`Request ${req.params.id} updated: Level ${request.levelOfApproval} -> ${updatedRequest.levelOfApproval}, Status: ${updatedRequest.status}`);
    
    res.json(updatedRequest);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update retest request (Admin only or student own request before approval)
router.put('/:id', auth, async (req, res) => {
  try {
    const request = await RetestRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Students can only update their own pending requests
    if (req.user.role === 'student') {
      if (request.student.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
      if (request.status !== 'pending' || request.levelOfApproval > 0) {
        return res.status(400).json({ message: 'Cannot update request that has been processed' });
      }
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Admin can update scheduled date and mark as completed
    if (req.user.role === 'admin') {
      if (req.body.scheduledDate) request.scheduledDate = req.body.scheduledDate;
      if (req.body.status === 'completed') request.status = 'completed';
    }

    Object.assign(request, req.body);
    await request.save();

    res.json(request);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete retest request
router.delete('/:id', auth, async (req, res) => {
  try {
    const request = await RetestRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Only admin or student (if pending) can delete
    if (req.user.role !== 'admin') {
      if (request.student.toString() !== req.user._id.toString() || request.status !== 'pending') {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Delete proof document file
    if (request.proofDocument && fs.existsSync(request.proofDocument)) {
      fs.unlinkSync(request.proofDocument);
    }

    await RetestRequest.findByIdAndDelete(req.params.id);
    res.json({ message: 'Request deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;


