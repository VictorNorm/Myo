import type { Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { programGenerationService } from "../services/programGenerationService";
import logger from "../services/logger";
import { 
  UserPreferences, 
  ProgramGenerationRequest 
} from "../types/programGeneration";

// Validation rules
export const programGenerationValidators = {
  generateProgram: [
    body("frequency")
      .isInt({ min: 2, max: 6 })
      .withMessage("Frequency must be between 2 and 6 days per week"),
    body("goal")
      .isIn(["STRENGTH", "HYPERTROPHY"])
      .withMessage("Goal must be either STRENGTH or HYPERTROPHY"),
    body("experience")
      .isIn(["BEGINNER", "INTERMEDIATE", "ADVANCED"])
      .withMessage("Experience must be BEGINNER, INTERMEDIATE, or ADVANCED"),
    body("sessionTime")
      .isInt({ min: 25, max: 120 })
      .withMessage("Session time must be between 25 and 120 minutes"),
    body("exerciseCount")
      .isInt({ min: 3, max: 6 })
      .withMessage("Exercise count must be between 3 and 6"),
    body("setsPerExercise")
      .isInt({ min: 2, max: 4 })
      .withMessage("Sets per exercise must be between 2 and 4"),
    body("programName")
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage("Program name must be a non-empty string (max 255 characters)"),
    body("focusMuscleGroups")
      .optional()
      .isArray()
      .withMessage("Focus muscle groups must be an array")
  ],

  previewProgram: [
    body("frequency")
      .isInt({ min: 2, max: 6 })
      .withMessage("Frequency must be between 2 and 6 days per week"),
    body("goal")
      .isIn(["STRENGTH", "HYPERTROPHY"])
      .withMessage("Goal must be either STRENGTH or HYPERTROPHY"),
    body("experience")
      .isIn(["BEGINNER", "INTERMEDIATE", "ADVANCED"])
      .withMessage("Experience must be BEGINNER, INTERMEDIATE, or ADVANCED"),
    body("sessionTime")
      .isInt({ min: 25, max: 120 })
      .withMessage("Session time must be between 25 and 120 minutes"),
    body("exerciseCount")
      .isInt({ min: 3, max: 6 })
      .withMessage("Exercise count must be between 3 and 6"),
    body("setsPerExercise")
      .isInt({ min: 2, max: 4 })
      .withMessage("Sets per exercise must be between 2 and 4")
  ],

  quickSetup: [
    body("experience")
      .optional()
      .isIn(["BEGINNER", "INTERMEDIATE", "ADVANCED"])
      .withMessage("Experience must be BEGINNER, INTERMEDIATE, or ADVANCED"),
    body("programName")
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage("Program name must be a non-empty string (max 255 characters)")
  ]
};

export const programGenerationController = {
  // POST /api/v2/programs/generate - Generate and create a program from preferences
  generateProgram: async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
          message: "Validation failed"
        });
      }

      if (!req.user?.id) {
        logger.warn("Attempted to generate program with no user in request");
        return res.status(401).json({
          success: false,
          error: "Authentication required",
          message: "User not authenticated"
        });
      }

      const userId = req.user.id;
      const preferences: UserPreferences = {
        frequency: req.body.frequency,
        goal: req.body.goal,
        experience: req.body.experience,
        sessionTime: req.body.sessionTime,
        exerciseCount: req.body.exerciseCount,
        setsPerExercise: req.body.setsPerExercise,
        focusMuscleGroups: req.body.focusMuscleGroups
      };

      const request: ProgramGenerationRequest = {
        preferences,
        userId,
        programName: req.body.programName
      };

      const result = await programGenerationService.generateProgramFromPreferences(request);

      if (result.success) {
        return res.status(201).json(result);
      } else {
        return res.status(400).json(result);
      }

    } catch (error) {
      logger.error(
        `Error generating program: ${error instanceof Error ? error.message : "Unknown error"}`,
        {
          stack: error instanceof Error ? error.stack : undefined,
          userId: req.user?.id,
          preferences: req.body
        }
      );
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to generate program"
      });
    }
  },

  // POST /api/v2/programs/preview - Preview a program without creating it
  previewProgram: async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
          message: "Validation failed"
        });
      }

      const preferences: UserPreferences = {
        frequency: req.body.frequency,
        goal: req.body.goal,
        experience: req.body.experience,
        sessionTime: req.body.sessionTime,
        exerciseCount: req.body.exerciseCount,
        setsPerExercise: req.body.setsPerExercise,
        focusMuscleGroups: req.body.focusMuscleGroups
      };

      const result = await programGenerationService.previewProgram(preferences);

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json(result);
      }

    } catch (error) {
      logger.error(
        `Error previewing program: ${error instanceof Error ? error.message : "Unknown error"}`,
        {
          stack: error instanceof Error ? error.stack : undefined,
          preferences: req.body
        }
      );
      
      return res.status(500).json({
        success: false,
        error: "Internal server error", 
        message: "Failed to preview program"
      });
    }
  },

  // POST /api/v2/programs/quick-setup - Generate program with recommended defaults
  quickSetup: async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
          message: "Validation failed"
        });
      }

      if (!req.user?.id) {
        logger.warn("Attempted to generate quick setup program with no user in request");
        return res.status(401).json({
          success: false,
          error: "Authentication required",
          message: "User not authenticated"
        });
      }

      const userId = req.user.id;
      const experience = req.body.experience || 'BEGINNER';

      logger.info('Generating quick setup program', {
        userId,
        experience,
        programName: req.body.programName
      });

      const result = await programGenerationService.generateQuickSetupProgram(userId, experience);

      if (result.success) {
        return res.status(201).json(result);
      } else {
        return res.status(400).json(result);
      }

    } catch (error) {
      logger.error(
        `Error generating quick setup program: ${error instanceof Error ? error.message : "Unknown error"}`,
        {
          stack: error instanceof Error ? error.stack : undefined,
          userId: req.user?.id,
          experience: req.body.experience
        }
      );
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to generate quick setup program"
      });
    }
  },

  // GET /api/v2/programs/recommended-preferences/:experience - Get recommended preferences
  getRecommendedPreferences: async (req: Request, res: Response) => {
    try {
      const experience = req.params.experience as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

      if (!['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].includes(experience)) {
        return res.status(400).json({
          success: false,
          error: "Invalid experience level",
          message: "Experience must be BEGINNER, INTERMEDIATE, or ADVANCED"
        });
      }

      const preferences = programGenerationService.getRecommendedPreferences(experience);

      return res.status(200).json({
        success: true,
        data: preferences,
        message: "Recommended preferences retrieved successfully"
      });

    } catch (error) {
      logger.error(
        `Error getting recommended preferences: ${error instanceof Error ? error.message : "Unknown error"}`,
        {
          stack: error instanceof Error ? error.stack : undefined,
          experience: req.params.experience
        }
      );
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to get recommended preferences"
      });
    }
  }
};