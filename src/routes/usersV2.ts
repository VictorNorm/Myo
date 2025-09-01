import { Router } from "express";
import authenticateToken from "../middleware/authenticateToken";
import { userController, userValidators } from "../controllers/userController";

const router = Router();

// Apply authentication middleware to all user routes
router.use("/api/v2/users", authenticateToken);
router.use("/users", authenticateToken); // Backward compatibility
router.use("/user", authenticateToken); // Backward compatibility
router.use("/assign-user", authenticateToken); // Backward compatibility

// V2 Routes

// GET /api/v2/users - Get all users
router.get(
	"/api/v2/users",
	userController.getAllUsers
);

// GET /api/v2/users/:id - Get user by ID
router.get(
	"/api/v2/users/:id",
	userValidators.getUserById,
	userController.getUserById
);

// POST /api/v2/users/assign - Assign user to trainer
router.post(
	"/api/v2/users/assign",
	userValidators.assignUser,
	userController.assignUserToTrainer
);

// GET /api/v2/users/trainer/assigned - Get users assigned to current trainer
router.get(
	"/api/v2/users/trainer/assigned",
	userController.getUsersByTrainer
);

// Backward compatibility routes for existing frontend
// TODO: Remove these once frontend is updated to use V2 paths

// GET /users - Get all users (backward compatibility)
router.get(
	"/users",
	userController.getAllUsers
);

// GET /user/:id - Get user by ID (backward compatibility)
router.get(
	"/user/:id",
	userValidators.getUserById,
	userController.getUserById
);

// POST /assign-user - Assign user to trainer (backward compatibility)
router.post(
	"/assign-user",
	userValidators.assignUser,
	userController.assignUserToTrainer
);

export default router;