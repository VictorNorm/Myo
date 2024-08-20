import { Router, Request } from 'express';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import authenticateToken from '../middleware/authenticateToken';
dotenv.config();

const router = Router();
const prisma = new PrismaClient();

router.get('/users', authenticateToken, async (req, res) => {

    const trainerId = req.body.id;
    console.log("TRAINER ID:", trainerId)
    console.log(req.user)

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

router.post('/assign-user', authenticateToken, async (req, res) => {

    console.log("req.user", req.user);
    console.log(req.body);

    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized: User not authenticated' });
          }
        const assignedUser = await prisma.users.update({
            where: { id: req.body.userId },
            data: { trainerId: req.user.id }
        });
        res.status(200).json("You've successfully assigned a user.");
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
    
});


export default router;