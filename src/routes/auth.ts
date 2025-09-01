import { Router, Request, Response } from "express";
import type { AuthenticatedUser } from "../../types/types";
import { PrismaClient } from "@prisma/client";
// biome-ignore lint/style/useImportType: <explanation>
import { Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import authenticateToken from "../middleware/authenticateToken";
import passport from "passport";
import { Strategy } from "passport-local";
import { body, validationResult } from "express-validator";
import sendVerificationEmail from "../middleware/sendEmail";
import signupLimiter from "../middleware/signupLimiter";
import crypto from "node:crypto";
import type { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { hoursToMilliseconds } from "date-fns";
import prisma from "../services/db";
import logger from "../services/logger";

dotenv.config();

const router = Router();

const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
function isValidEmail(email: string) {
	return emailPattern.test(email);
}

function isPrismaClientKnownRequestError(
	error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
	return (error as Prisma.PrismaClientKnownRequestError).code !== undefined;
}

passport.use(
	"local",
	new Strategy(async (username, password, done) => {
		const foundUser = await prisma.users.findUnique({
			where: {
				username,
			},
		});

		if (!foundUser) {
			return done(null, false);
		}

		const isValid = await bcrypt.compare(password, foundUser.password_hash);

		if (!isValid) {
			return done(null, false);
		}

		return done(null, foundUser);
	}),
);

function generateVerificationToken() {
	return crypto.randomBytes(32).toString("hex");
}

router.post(
	"/signup",
	signupLimiter,
	[
		body("firstName").notEmpty().withMessage("First name is required"),
		body("lastName").notEmpty().withMessage("Last name is required"),
		body("email").isEmail().withMessage("Invalid email format"),
			body("password")
				.isLength({ min: 8 })
				.matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
				.withMessage("Password must be at least 8 characters with uppercase, lowercase, number, and special character"),
	],
	async (req: Request, res: Response) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({
				data: {
					message: "Validation failed",
					errors: errors.array(),
				},
			});
		}

		const { firstName, lastName, email, password } = req.body;

		try {
			if (!firstName || !lastName || !email || !password) {
				res.status(400).json({
					data: {
						message: "All fields are required",
					},
				});
				return;
			}

			const existingUser = await prisma.users.findFirst({
				where: { username: email },
			});

			if (existingUser) {
				return res.status(400).json({
					data: { message: "A user is already registered with that email." },
				});
			}

			const verificationToken = await bcrypt.hash(
				crypto.randomBytes(32).toString(),
				10,
			);

			const role = "USER";
			const password_hash = await bcrypt.hash(password, 10);

			const newUser = await prisma.users.create({
				data: {
					firstname: firstName,
					lastname: lastName,
					username: email.toLowerCase(),
					password_hash,
					role,
					verificationToken,
					verificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
					emailVerified: false,
				},
			});

			// Call the function to send verification email
			await sendVerificationEmail(email, verificationToken);

			res.status(200).json({
				data: {
					message:
						"You've successfully created an account. Please verify your email.",
				},
			});
		} catch (error) {
			const prismaError = error as PrismaClientKnownRequestError;
			if (
				prismaError.code === "P2002" &&
				prismaError.meta?.target === "username"
			) {
				return res.status(400).json({
					data: {
						message: "Email is already in use.",
					},
				});
			}
			logger.error(
				`Error creating user: ${error instanceof Error ? error.message : "Unknown error"}`,
				{
					stack: error instanceof Error ? error.stack : undefined,
					code: isPrismaClientKnownRequestError(error) ? error.code : undefined,
					email: email ? `${email.substring(0, 3)}***` : undefined, // Log partial email for debugging (safely)
				},
			);
			res.status(500).send("An error occurred while creating the user.");
		}
	},
);

router.get("/verify-email", async (req, res) => {
	const token = req.query.token;

	if (typeof token !== "string") {
		return res
			.status(400)
			.json({ message: "Verification token is missing or invalid." });
	}

	try {
		const user = await prisma.users.findFirst({
			where: {
				verificationToken: token,
			},
		});

		if (!user) {
			return res.status(400).json({ message: "Invalid verification token." });
		}

		if (user.verificationTokenExpires == null) {
			return res
				.status(400)
				.json({ message: "Verification token expires is null." });
		}

		if (user.verificationTokenExpires < new Date()) {
			return res
				.status(400)
				.json({ message: "Verification token has expired." });
		}

		if (user.emailVerified) {
			return res
				.status(200)
				.json({ message: "Email already verified. You can now log in." });
		}

		// Update user to set emailVerified to true and clear the token fields
		await prisma.users.update({
			where: { id: user.id },
			data: {
				emailVerified: true,
				verificationToken: null,
				verificationTokenExpires: null,
			},
		});

		res.status(200).json({
			message: "Email verified successfully. You can now log in.",
			verified: true,
		});
	} catch (error) {
		logger.error(
			`Email verification error: ${error instanceof Error ? error.message : "Unknown error"}`,
			{
				stack: error instanceof Error ? error.stack : undefined,
				tokenPresent: !!token,
			},
		);
		res.status(500).json({ message: "Server error. Please try again later." });
	}
});

router.post("/login", (req, res, next) => {
	passport.authenticate("local", async (err: Error | null, user: any, info: object) => {
		if (err) {
			return next(err); // Handle errors from Passport
		}
		if (!user) {
			return res.status(401).json({ message: "Authentication failed" });
		}

		try {
			if (!process.env.JWT_SECRET) {
				throw new Error(
					"JWT_SECRET is not defined in the environment variables.",
				);
			}

			const token = jwt.sign(
				{
					id: user.id,
					role: user.role,
					firstName: user.firstname,
					lastName: user.lastname,
					username: user.username,
				},
				process.env.JWT_SECRET,
				{ expiresIn: "168h" },
			);

			res.json({ token });
		} catch (error) {
			next(error); // Handle errors in token generation
		}
	})(req, res, next);
});

router.get("/protectedRouted", authenticateToken, async (req, res) => {
	res.status(200).json({
		data: {
			message:
				"You can access protected routes, because you are logged in, like a healthy adult.",
		},
	});
});

router.get("/verificationSuccessful", authenticateToken, async (req, res) => {
	res.status(200).json({
		data: {
			message:
				"Your email has been succsessfully verified, please continue in the app.",
		},
	});
});

export default router;
