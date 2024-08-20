import { Request } from "express";

declare module "express" {
	interface Request {
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		user?: any; // Use a more specific type if known
	}
}
