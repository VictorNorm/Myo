import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
	host: process.env.SMTP_HOST,
	port: Number.parseInt(process.env.SMTP_PORT || "587"),
	secure: false,
	auth: {
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_PASS,
	},
});

const sendResetPasswordEmail = async (email: string, resetToken: string) => {
	if (!process.env.BASE_URL) {
		throw new Error("BASE_URL is not defined in the environment variables.");
	}

	const resetUrl = `${process.env.BASE_URL}/#/reset-password?token=${resetToken}`;

	const mailOptions = {
		from: '"Myo Fitness" <no-reply@myofitness.no>',
		to: email,
		subject: "Reset Your Password",
		text: `Click the following link to reset your password: ${resetUrl}`,
		html: `<p>Click the following link to reset your password:</p><a href="${resetUrl}">Reset Password</a>`,
	};

	try {
		await transporter.sendMail(mailOptions);
		console.log("Password reset email sent successfully");
	} catch (error) {
		console.error("Error sending password reset email:", error);
		throw error;
	}
};

export default sendResetPasswordEmail;
