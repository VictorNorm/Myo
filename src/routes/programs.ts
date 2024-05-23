import { Router, Request } from 'express';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import authenticateToken from '../middleware/authenticateToken';
dotenv.config();

const router = Router();
const prisma = new PrismaClient();


router.get('/programs', authenticateToken, async (req: Request, res) => {

  const userId = req.user.id;

  console.log(req.user)
  console.log(userId)

  const programs = await prisma.programs.findMany({ where : { userId }});

  console.log(programs)


  res.status(200).json({programs})
});



export default router;