const mongoose = require('mongoose');

const retestRequestSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  studentName: {
    type: String,
    required: true
  },
  class: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  semester: {
    type: Number,
    required: true,
    min: 1,
    max: 8
  },
  internal: {
    type: Number,
    required: true,
    min: 1,
    max: 3
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  subjectName: {
    type: String,
    required: true
  },
  proofDocument: {
    type: String, // File path
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending'
  },
  levelOfApproval: {
    type: Number,
    default: 0,
    // 0: Pending Subject Faculty
    // 1: Pending Class Counsellor
    // 2: Pending HoD
    // 3: Pending Dean
    // 4: Completed (All approvals done)
  },
  approvals: {
    subjectFaculty: {
      approved: { type: Boolean, default: false },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      approvedAt: Date,
      comments: String,
      rejected: { type: Boolean, default: false }
    },
    classCounsellor: {
      approved: { type: Boolean, default: false },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      approvedAt: Date,
      comments: String,
      rejected: { type: Boolean, default: false }
    },
    hod: {
      approved: { type: Boolean, default: false },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      approvedAt: Date,
      comments: String,
      rejected: { type: Boolean, default: false }
    },
    dean: {
      approved: { type: Boolean, default: false },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      approvedAt: Date,
      comments: String,
      rejected: { type: Boolean, default: false }
    }
  },
  scheduledDate: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

retestRequestSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('RetestRequest', retestRequestSchema);




