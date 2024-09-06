import { Router, Request } from "express";
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
import reCAPTCHA from "../middleware/reCAPTCHA";
import signupLimiter from "../middleware/signupLimiter";
import nodemailer from "nodemailer";
import crypto from "node:crypto";
import type { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { hoursToMilliseconds } from "date-fns";

dotenv.config();

const router = Router();
const prisma = new PrismaClient();

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

const transporter = nodemailer.createTransport({
	host: process.env.SMTP_HOST,
	port: Number.parseInt(process.env.SMTP_PORT || "587"),
	secure: false, // true for 465, false for other ports
	auth: {
		user: process.env.SMTP_USER, // generated ethereal user
		pass: process.env.SMTP_PASS, // generated ethereal password
	},
});

const sendVerificationEmail = async (
	email: string,
	verificationToken: string,
) => {
	if (!process.env.JWT_SECRET) {
		throw new Error("JWT_SECRET is not defined in the environment variables.");
	}
	if (!process.env.BASE_URL) {
		throw new Error("BASE_URL is not defined in the environment variables.");
	}

	const verificationUrl = `${process.env.BASE_URL}/verify-email?token=${verificationToken}`;

	const mailOptions = {
		from: '"Myo" <no-reply@myo.com>',
		to: email,
		subject: "Verify Your Email",
		text: `Click the following link to verify your email: ${verificationUrl}`,
		html: `<p>Click the following link to verify your email:</p><a href="${verificationUrl}">Verify Email</a>`,
	};

	await transporter.sendMail(mailOptions);
};

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
			.isLength({ min: 4 })
			.withMessage("Password must be at least 4 characters long"),
	],
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	async (req: any, res: any) => {
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

			const verificationToken = await bcrypt.hash(
				crypto.randomBytes(32).toString(),
				10,
			);

			console.log("AUTH ROUTE REACHED");
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
					verificationTokenExpires: new Date(
						Date.now() + hoursToMilliseconds(24),
					),
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
			console.error(error);
			res.status(500).send("An error occurred while creating the user.");
		}
	},
);

router.get("/verify-email", async (req, res) => {
	const token = req.query.token;

	if (typeof token !== "string") {
		return res.status(400).send("Verification token is missing or invalid.");
	}

	try {
		const user = await prisma.users.findFirst({
			where: {
				verificationToken: token,
				verificationTokenExpires: {
					gte: new Date(),
				},
			},
		});

		if (!user) {
			return res.status(400).send("Invalid or expired verification token.");
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

		res.redirect("/login");
		return;
	} catch (error) {
		console.error("Verification error:", error);
		if (error instanceof jwt.JsonWebTokenError) {
			res.status(400).send("Invalid token.");
		} else if (error instanceof jwt.TokenExpiredError) {
			res.status(400).send("Token has expired.");
		} else {
			res.status(500).send("Server error.");
		}
	}
});

router.post("/login", (req, res, next) => {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	console.log("BONKA BONKA");
	passport.authenticate("local", async (err: any, user: any, info: any) => {
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
