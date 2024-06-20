import { Router, Request } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import authenticateToken from '../middleware/authenticateToken';
import passport from 'passport';
import { Strategy } from 'passport-local';
dotenv.config();

const router = Router();
const prisma = new PrismaClient();

const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
function isValidEmail(email: string) {
  return emailPattern.test(email);
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

}))


router.post('/signup', async (req, res) => {
  
  const {firstName, lastName, email, password} = req.body;

  if(!firstName || !lastName || !email || !password) {
  return res.status(400).json({
    data: {
      message: "Please provide: firstName, lastName, email and password."
    }
  })
 }
  
  if(!isValidEmail(email)) {
    return res.status(400).json({
      data: {
        message: "Invalid email format."
      }
    })
  }

  try {
    const role = "USER";
    const password_hash = await bcrypt.hash(password, 10);
  
    const newUser = await prisma.users.create({
      data: {
        firstname: firstName, 
        lastname: lastName,
        username: email,      
        password_hash,        
        role,                 
      },
    });
  
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while creating the user.");
  }

  res.status(200).json({
    data: {
      message: "You've successfully created an account."
    }
  });
});

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