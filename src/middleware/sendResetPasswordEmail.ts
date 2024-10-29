import nodemailer, {
	type TransportOptions,
	type SentMessageInfo,
} from "nodemailer";
import type Mail from "nodemailer/lib/mailer";

const transporter = nodemailer.createTransport({
	host: process.env.SMTP_HOST,
	port: Number(process.env.SMTP_PORT),
	secure: false,
	auth: {
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_PASS,
	},
	tls: {
		rejectUnauthorized: true,
		minVersion: "TLSv1.2",
	},
	debug: true,
} as TransportOptions);

const sendResetPasswordEmail = async (
	email: string,
	resetToken: string,
): Promise<SentMessageInfo> => {
	if (!process.env.CLIENT_URL) {
		throw new Error("CLIENT_URL is not defined in the environment variables.");
	}

	if (!process.env.SMTP_USER) {
		throw new Error("SMTP_USER is not defined in the environment variables.");
	}

	const resetUrl = `${process.env.CLIENT_URL}/#/reset-password?token=${resetToken}`;

	const mailOptions: Mail.Options = {
		from: {
			name: "Myo Fitness",
			address: process.env.SMTP_USER,
		},
		to: email,
		subject: "Reset Your Password",
		text: `Click the following link to reset your password: ${resetUrl}`,
		html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Reset Your Password</h2>
                <p>Click the following link to reset your password:</p>
                <p>
                    <a href="${resetUrl}" 
                       style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
                        Reset Password
                    </a>
                </p>
                <p>If you didn't request this password reset, please ignore this email.</p>
                <p>This link will expire in 1 hour.</p>
            </div>
        `,
	};

	try {
		await transporter.verify();
		console.log("SMTP connection verified successfully");

		const info: SentMessageInfo = await transporter.sendMail(mailOptions);
		console.log("Password reset email sent successfully to:", email);

		if ("messageId" in info) {
			console.log("Message ID:", info.messageId);
		}

		return info;
	} catch (error) {
		console.error("Detailed error:", error);
		throw error;
	}
};

export default sendResetPasswordEmail;
