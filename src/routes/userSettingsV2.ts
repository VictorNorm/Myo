import { Router } from "express";
import authenticateToken from "../middleware/authenticateToken";
import { userSettingsController, userSettingsValidators } from "../controllers/userSettingsController";

const router = Router();

// Apply authentication middleware to all user settings routes
router.use("/api/v2/user-settings", authenticateToken);
router.use("/user-settings", authenticateToken); // Backward compatibility

// V2 Routes

// GET /api/v2/user-settings - Get user settings
router.get(
	"/api/v2/user-settings",
	userSettingsController.getUserSettings
);

// PATCH /api/v2/user-settings - Update user settings
router.patch(
	"/api/v2/user-settings",
	userSettingsValidators.updateSettings,
	userSettingsController.updateUserSettings
);

// GET /api/v2/user-settings/defaults - Get default settings
router.get(
	"/api/v2/user-settings/defaults",
	userSettingsController.getDefaultSettings
);

// POST /api/v2/user-settings/reset - Reset settings to defaults
router.post(
	"/api/v2/user-settings/reset",
	userSettingsController.resetUserSettings
);

// Backward compatibility routes for existing frontend
// TODO: Remove these once frontend is updated to use V2 paths

// GET /user-settings - Get user settings (backward compatibility)
router.get(
	"/user-settings",
	userSettingsController.getUserSettings
);

// PATCH /user-settings - Update user settings (backward compatibility)
router.patch(
	"/user-settings",
	userSettingsValidators.updateSettings,
	userSettingsController.updateUserSettings
);

export default router;