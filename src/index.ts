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
import muscleGroups from "./routes/muscleGroups";
import progression from "./routes/progression";
import template from "./routes/template";
import userSettings from "./routes/userSettings";

console.log("Application starting...");

const prisma = new PrismaClient();
const app = express();

app.set("trust proxy", 1);

const safeParseNumber = (envName: string, defaultValue: number): number => {
	const envValue = process.env[envName];
	if (envValue) {
		const parsed = Number.parseInt(envValue, 10);
		return Number.isNaN(parsed) ? defaultValue : parsed;
	}
	return defaultValue;
};

const PORT = safeParseNumber("PORT", 3000);
const HOST = process.env.HOST || "0.0.0.0";

app.use(
	cors({
		origin: [
			"https://www.myofitness.no",
			"http://localhost:4000",
			"http://192.168.50.195:8081",
		],
		methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowedHeaders: [
			"Content-Type",
			"Authorization",
			"Cache-Control",
			"Pragma",
			"Expires",
		],
		credentials: true,
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
app.use(muscleGroups);
app.use(progression);
app.use(template);
app.use(userSettings);

app.get("/", (req, res) => {
	res.json({ message: "Hello Worldfucker" });
});

app.get("/health", (req, res) => {
	try {
		// You might want to add a basic DB check here too
		res.status(200).json({
			status: "healthy",
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		res.status(500).json({
			status: "unhealthy",
			error: error instanceof Error ? error.message : "Unknown error",
		});
	}
});

app
	.listen(PORT, HOST, () => {
		console.log(`Server is running on http://${HOST}:${PORT}`);
	})
	.on("error", (err) => {
		console.error("Failed to start server:", err);
		process.exit(1);
	});
