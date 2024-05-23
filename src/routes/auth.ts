import { Router, Request } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import authenticateToken from '../middleware/authenticateToken';
dotenv.config();

const router = Router();
const prisma = new PrismaClient();

const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
function isValidEmail(email: string) {
  return emailPattern.test(email);
}


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

  const foundUser = await prisma.users.findUnique({
    where: {
      username: email
    }
  })

  if (foundUser) {
    return res.status(400).json({
      data: {
        message: "User already exists with the provided email."
      }
    });
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

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if(!username || !password) {
    return res.status(400).json({
      data: {
        message: "Please provide: username and password."
      }
    })
   }

  const user = await prisma.users.findUnique({
      where: {
          username: username,
      },
  });

  if (!user) {
      return res.status(404).send('User not found');
  }

  const isValid = await bcrypt.compare(password, user.password_hash);

  if (!isValid) {
      return res.status(401).send('Invalid credentials');
  }

  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in the environment variables.');
  }

  const token = jwt.sign( { id: user.id, firstName: user.firstname, lastName: user.lastname, username: user.username }, process.env.JWT_SECRET, { expiresIn: '24h' }); // Replace 'your_secret_key' with a real secret key

  res.json({ token });
});



router.get('/protectedRouted', authenticateToken, async (req, res) => {

  res.status(200).json({
    data: {
      message: "You can access protected routes, because you are logged in, like a healthy adult."
    }})

});


export default router;