import { Router, Request } from 'express';
import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import authenticateToken from '../middleware/authenticateToken';
import passport from 'passport';
import { Strategy } from 'passport-local';
import { body, validationResult } from 'express-validator';
import reCAPTCHA from "../middleware/reCAPTCHA";
import signupLimiter from '../middleware/signupLimiter';
import nodemailer from 'nodemailer';

dotenv.config();

const router = Router();
const prisma = new PrismaClient();

const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
function isValidEmail(email: string) {
  return emailPattern.test(email);
}

function isPrismaClientKnownRequestError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return (error as Prisma.PrismaClientKnownRequestError).code !== undefined;
}

passport.use('local', new Strategy(async (username, password, done) => {

  const foundUser = await prisma.users.findUnique({
    where: {
      username
    }
  });

  if(!foundUser) {
    return done(null, false);
  }

  const isValid = await bcrypt.compare(password, foundUser.password_hash);

  if (!isValid) {
    return done(null, false);
  }

  return done(null, foundUser);

}));

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER, // generated ethereal user
    pass: process.env.SMTP_PASS, // generated ethereal password
  },
});

const sendVerificationEmail = async (email: string, userId: number) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in the environment variables.');
  }
  if (!process.env.BASE_URL) {
    throw new Error('BASE_URL is not defined in the environment variables.');
  }

  const verificationToken = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const verificationUrl = `${process.env.BASE_URL}/verify-email?token=${verificationToken}`;

  const mailOptions = {
    from: '"Myo" <no-reply@myo.com>', // sender address
    to: email, // list of receivers
    subject: 'Verify Your Email', // Subject line
    text: `Click the following link to verify your email: ${verificationUrl}`, // plain text body
    html: `<p>Click the following link to verify your email:</p><a href="${verificationUrl}">Verify Email</a>`, // html body
  };

  await transporter.sendMail(mailOptions);
};

router.post(
  '/signup',
  signupLimiter,
  reCAPTCHA, // Middleware to verify reCAPTCHA
  [
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Invalid email format'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
  ],
  async (req: any, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        data: {
          message: 'Validation failed',
          errors: errors.array()
        }
      });
    }

    const { firstName, lastName, email, password } = req.body;

    try {
      const role = "USER";
      const password_hash = await bcrypt.hash(password, 10);

      const newUser = await prisma.users.create({
        data: {
          firstname: firstName,
          lastname: lastName,
          username: email,
          password_hash,
          role
        }
      });

      // Send a verification email here (pseudo-code)
      // await sendVerificationEmail(newUser.email, newUser.id);
      await sendVerificationEmail(email, newUser.id);


      res.status(200).json({
        data: {
          message: "You've successfully created an account. Please verify your email."
        }
      });
    } catch (error) {
      const prismaError = error as Prisma.PrismaClientKnownRequestError;
      if (prismaError.code === 'P2002' && prismaError.meta?.target === 'username') {
        return res.status(400).json({
          data: {
            message: 'Email is already in use.'
          }
        });
      }
      console.error(error);
      res.status(500).send("An error occurred while creating the user.");
    }
  }
);

router.post('/login', (req, res, next) => {
  passport.authenticate('local', async (err: any, user: any, info: any) => {
    if (err) {
      return next(err); // Handle errors from Passport
    }
    if (!user) {
      return res.status(401).json({ message: 'Authentication failed' });
    }

    try {
      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not defined in the environment variables.');
      }

      const token = jwt.sign(
        { 
          id: user.id, 
          firstName: user.firstname, 
          lastName: user.lastname, 
          username: user.username 
        }, 
        process.env.JWT_SECRET, 
        { expiresIn: '168h' }
      );

      res.json({ token });
    } catch (error) {
      next(error); // Handle errors in token generation
    }
  })(req, res, next);
});


router.get('/protectedRouted', authenticateToken, async (req, res) => {

  res.status(200).json({
    data: {
      message: "You can access protected routes, because you are logged in, like a healthy adult."
    }})

});


export default router;