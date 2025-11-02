const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  uniqueId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['student', 'faculty', 'hod', 'dean', 'admin'],
    required: true
  },
  // Student specific fields
  class: String,
  year: Number,
  semester: Number,
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  // Faculty specific fields
  isClassCounsellor: {
    type: Boolean,
    default: false
  },
  counsellorClass: String, // Class they counsel
  counsellorSemester: Number, // Semester they counsel
  // Faculty can teach multiple subjects across semesters
  subjects: [{
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject'
    },
    semester: Number,
    class: String
  }],
  // HoD specific
  departmentAsHod: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);




