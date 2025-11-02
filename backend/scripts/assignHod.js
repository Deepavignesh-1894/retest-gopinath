const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Department = require('../models/Department');
const User = require('../models/User');

dotenv.config();

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/retest-app';

async function connect() {
  await mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
}

async function list() {
  const depts = await Department.find().lean();
  const users = await User.find().lean();

  console.log('Departments:');
  depts.forEach(d => console.log(JSON.stringify({ id: d._id.toString(), name: d.name, hod: d.hod ? d.hod.toString() : null })));

  console.log('\nUsers:');
  users.forEach(u => console.log(JSON.stringify({ id: u._id.toString(), uniqueId: u.uniqueId, name: u.name, role: u.role, departmentAsHod: u.departmentAsHod ? u.departmentAsHod.toString() : null })));
}

async function assign(deptId, userId) {
  if (!deptId || !userId) {
    console.error('Usage: node assignHod.js assign <DEPT_ID> <USER_ID>');
    process.exit(1);
  }

  const dept = await Department.findById(deptId);
  if (!dept) {
    console.error('Department not found:', deptId);
    process.exit(1);
  }

  const user = await User.findById(userId);
  if (!user) {
    console.error('User not found:', userId);
    process.exit(1);
  }

  // Update department.hod
  dept.hod = user._id;
  await dept.save();

  // Set user's departmentAsHod
  user.departmentAsHod = dept._id;
  await user.save();

  console.log(`Assigned user ${user.name} (${user._id}) as HOD of ${dept.name} (${dept._id})`);
}

async function main() {
  try {
    await connect();

    const [, , cmd, a, b] = process.argv;
    if (!cmd || cmd === 'list') {
      await list();
      process.exit(0);
    }

    if (cmd === 'assign') {
      await assign(a, b);
      process.exit(0);
    }

    console.error('Unknown command. Usage: node assignHod.js [list] | assign <DEPT_ID> <USER_ID>');
    process.exit(1);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main();
