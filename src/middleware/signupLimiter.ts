import rateLimit from 'express-rate-limit';

// Rate limiting middleware
const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    data: {
      message: "Too many signup attempts from this IP, please try again after 15 minutes."
    }
  }
});

export default signupLimiter;