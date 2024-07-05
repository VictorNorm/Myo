import { Router, Request } from 'express';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import authenticateToken from '../middleware/authenticateToken';
dotenv.config();

const router = Router();
const prisma = new PrismaClient();

router.get('/exercises', authenticateToken, async (req, res) => {

    try {
        // const test = await prisma.userCompletedExercises.findMany();
        // console.log(test);
        const exercises = await prisma.exercises.findMany()
        res.status(200).json(exercises);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/exercises', authenticateToken, async (req, res) => {
    const { name, muscleGroup } = req.body;

    if (!name || !muscleGroup) {
        return res.status(400).json({ error: 'Please provide valid name and muscle group of exercise.' });
    }

    try {
        const foundExercise = await prisma.exercises.findFirst({
            where: { name: name }
        });

        if (foundExercise) {
            return res.status(400).json({ error: 'Exercise already exists.' });
        }

        const newExercise = await prisma.exercises.create({
            data: {
                name: name,
                muscle_group: muscleGroup,
            },
        });

        res.status(200).json({ message: "You've successfully added an exercise.", exercise: newExercise });
    } catch (error) {
        console.error('Error creating exercise:', error);
        res.status(500).json({ error: 'An error occurred while adding the exercise.' });
    }
});


export default router;