import { Router, Request } from 'express';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import authenticateToken from '../middleware/authenticateToken';
dotenv.config();

const router = Router();
const prisma = new PrismaClient();

router.get('/users', authenticateToken, async (req, res) => {

    try {
        const users = await prisma.users.findMany()
        const userDetails: any = [];

        users.forEach((user) => {
            const relevantUserDetails = {
                id: user.id,
                firstName: user.firstname,
                lastName: user.lastname,
                username: user.username
            }
            userDetails.push(relevantUserDetails)
        })
        
        res.status(200).json(userDetails);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
    
});


export default router;