import winston from "winston";
import dotenv from "dotenv";

dotenv.config();

// Define log levels
const levels = {
	error: 0,
	warn: 1,
	info: 2,
	http: 3,
	debug: 4,
};

// Define level based on environment
const level = () => {
	const env = process.env.NODE_ENV || "development";
	return env === "development" ? "debug" : "warn";
};

// Define colors for each level
const colors = {
	error: "red",
	warn: "yellow",
	info: "green",
	http: "magenta",
	debug: "blue",
};

// Add colors to winston
winston.addColors(colors);

// Define format
const format = winston.format.combine(
	winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
	winston.format.printf(
		(info) => `${info.timestamp} ${info.level}: ${info.message}`,
	),
);

// Define transports
const transports = [
	new winston.transports.Console({
		format: winston.format.combine(
			winston.format.colorize({ all: true }),
			format,
		),
	}),
	new winston.transports.File({
		filename: "logs/error.log",
		level: "error",
	}),
	new winston.transports.File({ filename: "logs/all.log" }),
];

// Create the logger
const logger = winston.createLogger({
	level: level(),
	levels,
	format,
	transports,
});

export default logger;
