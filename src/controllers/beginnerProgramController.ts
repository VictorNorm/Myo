import type { Request, Response } from "express";
import { validationResult } from "express-validator";
import { success, error, validationError, ErrorCodes } from "../../types/responses";
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
        return res.status(400).json(validationError(errors.array()));
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(
          error(ErrorCodes.UNAUTHORIZED, "User not authenticated")
        );
      }

      const questionnaireData: BeginnerQuestionnaireData = req.body;

      const result = await beginnerProgramService.processQuestionnaire(userId, questionnaireData);

      return res.status(200).json(
        success(result, 'Questionnaire processed successfully')
      );
    } catch (err) {
      logger.error('Error in submitQuestionnaire controller', {
        error: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined
      });

      return res.status(500).json(
        error(
          ErrorCodes.INTERNAL_ERROR,
          'Internal server error',
          err instanceof Error ? err.message : undefined
        )
      );
    }
  },

  // POST /api/v2/beginner/create-program
  createProgram: async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(validationError(errors.array()));
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(
          error(ErrorCodes.UNAUTHORIZED, "User not authenticated")
        );
      }

      const request: CreateBeginnerProgramRequest = req.body;

      const result = await beginnerProgramService.createBeginnerProgram(userId, request);

      return res.status(201).json(
        success(result, 'Beginner program created successfully')
      );
    } catch (err) {
      logger.error('Error in createProgram controller', {
        error: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined
      });

      return res.status(500).json(
        error(
          ErrorCodes.INTERNAL_ERROR,
          'Internal server error',
          err instanceof Error ? err.message : undefined
        )
      );
    }
  }
};