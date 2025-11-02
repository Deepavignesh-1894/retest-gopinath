const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Enhanced population of user data
    const user = await User.findById(decoded.userId)
      .populate('department')
      .populate({
        path: 'departmentAsHod',
        select: '_id name'
      });

    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    // Add debug logging
    console.log('Authenticated user:', {
      id: user._id,
      role: user.role,
      departmentAsHod: user.departmentAsHod
    });

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = auth;




