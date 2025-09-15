import express from "express";
import auth from "./routes/auth";
import programsV2 from "./routes/programsV2";
import workoutsV2 from "./routes/workoutsV2";
import exercisesV2 from "./routes/exercisesV2";
import usersV2 from "./routes/usersV2";
import passport from "passport";
import cors from "cors";
import helmet from "helmet";
import passwordV2 from "./routes/passwordV2";
import muscleGroupsV2 from "./routes/muscleGroupsV2";
import progressionV2 from "./routes/progressionV2";
import templateV2 from "./routes/templateV2";
import userSettingsV2 from "./routes/userSettingsV2";
import statsV2 from "./routes/statsV2";
import programTemplatesV2 from "./routes/programTemplatesV2";
import programGenerationV2 from "./routes/programGenerationV2";
import { errorHandler } from "./utils/errorHandler";
import logger from "./services/logger";
import httpLogger from "./middleware/httpLogger";
import prisma from "./services/db";

logger.info("Application starting...");

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

// Apply middleware
app.use(httpLogger); // Move this before routes!
app.use(helmet());
app.use(express.json());
app.use(passport.initialize());

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

// Apply routes
app.use(auth);
app.use(programsV2);
app.use(workoutsV2);
app.use(usersV2);
app.use(passwordV2);
app.use(muscleGroupsV2);
app.use(progressionV2);
app.use(templateV2);
app.use(userSettingsV2);
app.use(statsV2);
app.use(exercisesV2);
app.use(programTemplatesV2);
app.use(programGenerationV2);

app.get("/", (req, res) => {
	res.json({ message: "Hello World" });
});

app.get("/health", (req, res) => {
	res.status(200).json({
		status: "healthy",
	});
});
app.get("/metrics", async (req, res) => {
	res.set("Content-Type", "text");
	const metrics = await prisma.$metrics.prometheus();
	res.status(200).end(metrics);
});

// Apply global error handler
app.use(errorHandler);

logger.info(
	`Environment PORT=${process.env.PORT}, resolved PORT=${PORT}, HOST=${HOST}`,
);
app
	.listen(PORT, HOST, () => {
		logger.info(`Server is running on http://${HOST}:${PORT}`);
	})
	.on("error", (err) => {
		logger.error(`Failed to start server: ${err.message}`);
		process.exit(1);
	});
