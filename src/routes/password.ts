import { Router, Request } from "express";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import authenticateToken from "../middleware/authenticateToken";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import nodemailer from "nodemailer";
import sendResetPasswordEmail from "../middleware/sendResetPasswordEmail";
dotenv.config();

const router = Router();
const prisma = new PrismaClient();

router.post("/forgot-password", async (req, res) => {
	const { email } = req.body;

	// Generate reset token
	const resetToken = crypto.randomBytes(20).toString("hex");
	const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

	try {
		const hashedResetToken = await bcrypt.hash(resetToken, 10);
		// Update user with reset token
		await prisma.users.update({
			where: { username: email },
			data: { resetToken: hashedResetToken, resetTokenExpiry },
		});

		// Send email with reset link
		await sendResetPasswordEmail(email, resetToken);

		res.json({ message: "Password reset email sent." });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Error processing request" });
	}
});

router.post("/reset-password", async (req, res) => {
	const { token, newPassword } = req.body;

	try {
		// Find user with non-expired reset token
		const user = await prisma.users.findFirst({
			where: {
				resetToken: { not: null }, // Ensure resetToken is not null
				resetTokenExpiry: { gt: new Date() },
			},
		});

		if (!user) {
			return res.status(400).json({ error: "Invalid or expired reset token." });
		}

		if (user.resetToken === null) {
			return res.status(400).json({ error: "User reset token is null." });
		}

		// Verify the provided token against the hashed token in the database
		const isValidToken = bcrypt.compare(token, user.resetToken);

		if (!isValidToken) {
			return res.status(400).json({ error: "Invalid reset token." });
		}

		// Hash the new password
		const hashedPassword = await bcrypt.hash(newPassword, 10);

		// Update password, clear reset token and expiry
		await prisma.users.update({
			where: { id: user.id },
			data: {
				password_hash: hashedPassword,
				resetToken: null,
				resetTokenExpiry: null,
			},
		});

		res.json({ message: "Password updated successfully" });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Error resetting password" });
	}
});

async function sendResetEmail(email: string, resetToken: string) {
	const resetLink = `Myo://reset-password?token=${resetToken}`;
	// Create a test account if you don't have a real email service set up
	const testAccount = await nodemailer.createTestAccount();

	// Create a transporter
	const transporter = nodemailer.createTransport({
		host: "smtp.ethereal.email",
		port: 587,
		secure: false, // true for 465, false for other ports
		auth: {
			user: testAccount.user, // generated ethereal user
			pass: testAccount.pass, // generated ethereal password
		},
	});

	// Send mail with defined transport object
	const info = await transporter.sendMail({
		from: '"Myo" <noreply@myofitness.no>',
		to: email,
		subject: "Password Reset",
		text: `You requested a password reset. Please use the following link to reset your password: http://yourapp.com/reset-password?token=${resetToken}`,
		html: `<p>You requested a password reset. Please use the following link to reset your password:</p>
             <a href="${resetLink}">Reset Password</a>`,
	});

	console.log("Message sent: %s", info.messageId);
	console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
}

export default router;
