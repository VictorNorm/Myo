import express from "express";
import { PrismaClient } from "@prisma/client";
import auth from "./routes/auth";
import programs from "./routes/programs";
import workouts from "./routes/workouts";
import exercises from "./routes/exercises";
import users from "./routes/users";
import passport from "passport";
import cors from "cors";
import helmet from "helmet";
import password from "./routes/password";

console.log("Application starting...");

const prisma = new PrismaClient();
const app = express();

app.set("trust proxy", 1);

const safeParseNumber = (envName: string, defaultValue: number): number => {
	const envValue = process.env[envName];
	if (envValue) {
		return Number.parseInt(envValue, 10);
	}
	return defaultValue;
};

const PORT = safeParseNumber("PORT", 3000);

app.use(
	cors({
		origin: [
			"https://www.myofitness.no",
			"http://localhost:4000",
			"http://192.168.50.195:8081",
		], // Allow requests from this origin
		methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Allow additional methods if needed
		allowedHeaders: ["Content-Type", "Authorization"], // Add any custom headers you are using
		credentials: true, // Enable cookies and other credentials
	}),
);

app.options("*", cors());

app.use(helmet());
app.use(express.json());
app.use(passport.initialize());

app.use(auth);
app.use(programs);
app.use(workouts);
app.use(exercises);
app.use(users);
app.use(password);

app.get("/", (req, res) => {
	res.json({ message: "Hello Worldfucker" });
});

app.get("/health", (req, res) => {
	res.status(200).json({ status: "ok" });
});

app.listen(PORT, "0.0.0.0", () => {
	console.log(`Server is running on http://localhost:${PORT}`);
});
