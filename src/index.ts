import express from 'express';
import { PrismaClient } from '@prisma/client';
import auth from "./routes/auth";
import programs from "./routes/programs";
import workouts from "./routes/workouts";


const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use(auth);
app.use(programs);
app.use(workouts);

app.get('/', (req, res) => {
  res.json({ message: 'Hello Worldfucker' });
});

// Define more routes and endpoints as needed

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
