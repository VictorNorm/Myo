import expressWinston from "express-winston";
import winston from "winston";

const httpLogger = expressWinston.logger({
	transports: [new winston.transports.Console()],
	format: winston.format.combine(
		winston.format.colorize(),
		winston.format.json(),
	),
	meta: process.env.NODE_ENV !== "production", // log metadata in development
	msg: "HTTP {{req.method}} {{req.url}}",
	expressFormat: true,
	colorize: true,
});

export default httpLogger;
