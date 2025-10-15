import type { Request, Response } from "express";
import { validationResult } from "express-validator";
import { beginnerProgramService } from "../services/beginnerProgramService";
import { beginnerProgramValidators } from "./beginnerProgramValidators";
import logger from "../services/logger";
import type { BeginnerQuestionnaireData, CreateBeginnerProgramRequest } from "../../types/beginnerProgram";

export { beginnerProgramValidators };

export const beginnerProgramController = {
  // POST /api/v2/beginner/questionnaire
  submitQuestionnaire: async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
          message: "Validation failed"
        });
      }

      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated"
        });
      }

      const questionnaireData: BeginnerQuestionnaireData = req.body;

      const result = await beginnerProgramService.processQuestionnaire(userId, questionnaireData);

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Error in submitQuestionnaire controller', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  },

  // POST /api/v2/beginner/create-program
  createProgram: async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
          message: "Validation failed"
        });
      }

      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated"
        });
      }

      const request: CreateBeginnerProgramRequest = req.body;

      const result = await beginnerProgramService.createBeginnerProgram(userId, request);

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(201).json(result);
    } catch (error) {
      logger.error('Error in createProgram controller', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
};