import express from 'express';
import { PrismaClient } from '@prisma/client';
import auth from "./routes/auth";
import programs from "./routes/programs";
import workouts from "./routes/workouts";
import exercises from "./routes/exercises";
import users from "./routes/users";
import passport from 'passport';
import cors from 'cors';
import helmet from 'helmet';

const prisma = new PrismaClient();
const app = express();

const safeParseNumber = (envName: string, defaultValue: number): number => {
  if (process.env[envName]) {
    return parseInt(process.env[envName]!, 10);
  } else {
    return defaultValue;
  }
}

const PORT = safeParseNumber('PORT', 3000)

app.use(cors({
  origin: 'http://localhost:4000', // Allow requests from this origin
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allow additional methods if needed
  allowedHeaders: ['Content-Type', 'Authorization'], // Add any custom headers you are using
  credentials: true, // Enable cookies and other credentials
}));


app.options('*', cors());


app.use(helmet());
app.use(express.json());
app.use(passport.initialize());

app.use(auth);
app.use(programs);
app.use(workouts);
app.use(exercises);
app.use(users);

app.get('/', (req, res) => {
  res.json({ message: 'Hello Worldfucker' });
});

// Define more routes and endpoints as needed

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
