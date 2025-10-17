import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { authService } from "../services/authService";
import logger from "../services/logger";

export function configurePassport() {
	passport.use(
		"local",
		new LocalStrategy(
			{ usernameField: "username", passwordField: "password" },
			async (username, password, done) => {
				try {
					const user = await authService.authenticateUser(username, password);
					
					if (!user) {
						return done(null, false, { message: "Invalid credentials" });
					}
					
					return done(null, user);
				} catch (error) {
					logger.error("Passport authentication error", {
						error: error instanceof Error ? error.message : "Unknown error",
						username: username ? `${username.substring(0, 3)}***` : undefined
					});
					return done(error);
				}
			}
		)
	);
}

export default passport;