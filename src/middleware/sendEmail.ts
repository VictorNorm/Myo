import nodemailer from "nodemailer";

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

	const verificationUrl = `${process.env.BASE_URL}/#/verify-email?token=${verificationToken}`;

	const mailOptions = {
		from: '"Myo" <no-reply@myo.com>',
		to: email,
		subject: "Verify Your Email",
		text: `Click the following link to verify your email: ${verificationUrl}`,
		html: `<p>Click the following link to verify your email:</p><a href="${verificationUrl}">Verify Email</a>`,
	};

	await transporter.sendMail(mailOptions);
};

export default sendVerificationEmail;
