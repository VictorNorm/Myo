import type { Request, Response } from "express";
import { validationResult } from "express-validator";
import { success, error, validationError, ErrorCodes } from "../../types/responses";
import { programTemplateService } from "../services/programTemplateService";
import { programTemplateValidators } from "./programTemplateValidators";
import logger from "../services/logger";
import type {
  TemplateFilters,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  CreateProgramFromTemplateRequest
} from "../../types/programTemplates";

export { programTemplateValidators };

export const programTemplateController = {
  // GET /api/v2/templates - List all templates with optional filters
  getTemplates: async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(validationError(errors.array()));
      }

      const filters: TemplateFilters = {
        category: req.query.category as any,
        difficulty: req.query.difficulty as any,
        goal: req.query.goal as any,
        frequency_per_week: req.query.frequency_per_week ? Number(req.query.frequency_per_week) : undefined,
        program_type: req.query.program_type as any
      };

      // Remove undefined values from filters
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof TemplateFilters] === undefined) {
          delete filters[key as keyof TemplateFilters];
        }
      });

      const templates = Object.keys(filters).length > 0 
        ? await programTemplateService.getTemplatesByFilters(filters)
        : await programTemplateService.getAllTemplates();

      return res.status(200).json(
        success(templates, 'Templates retrieved successfully')
      );
    } catch (err) {
      logger.error(`Error in getTemplates controller: ${err instanceof Error ? err.message : 'Unknown error'}`, {
        stack: err instanceof Error ? err.stack : undefined,
        query: req.query
      });
      
      return res.status(500).json(
        error(
          ErrorCodes.INTERNAL_ERROR,
          'Failed to retrieve templates',
          err instanceof Error ? err.message : undefined
        )
      );
    }
  },

  // GET /api/v2/templates/:id - Get specific template with full details
  getTemplateById: async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(validationError(errors.array()));
      }

      const templateId = Number(req.params.id);
      const template = await programTemplateService.getTemplateDetails(templateId);

      return res.status(200).json(
        success(template, 'Template details retrieved successfully')
      );
    } catch (err) {
      logger.error(`Error in getTemplateById controller: ${err instanceof Error ? err.message : 'Unknown error'}`, {
        stack: err instanceof Error ? err.stack : undefined,
        templateId: req.params.id
      });

      if (err instanceof Error && err.message.includes('not found')) {
        return res.status(404).json(
          error(ErrorCodes.NOT_FOUND, 'Template not found')
        );
      }

      if (err instanceof Error && err.message.includes('no longer available')) {
        return res.status(410).json(
          error('gone', 'Template is no longer available')
        );
      }
      
      return res.status(500).json(
        error(
          ErrorCodes.INTERNAL_ERROR,
          'Failed to retrieve template details',
          err instanceof Error ? err.message : undefined
        )
      );
    }
  },

  // POST /api/v2/templates/:id/create-program - Create program from template
  createProgramFromTemplate: async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(validationError(errors.array()));
      }

      if (!req.user?.id) {
        return res.status(401).json(
          error(ErrorCodes.UNAUTHORIZED, "User not authenticated")
        );
      }

      const templateId = Number(req.params.id);
      const userId = req.user.id;
      const programData: CreateProgramFromTemplateRequest = {
        name: req.body.name,
        start_date: req.body.start_date ? new Date(req.body.start_date) : undefined
      };

      const result = await programTemplateService.createProgramFromTemplate(
        templateId,
        userId,
        programData
      );

      return res.status(201).json(
        success(result, 'Program created from template successfully')
      );
    } catch (err) {
      logger.error(`Error in createProgramFromTemplate controller: ${err instanceof Error ? err.message : 'Unknown error'}`, {
        stack: err instanceof Error ? err.stack : undefined,
        templateId: req.params.id,
        userId: req.user?.id,
        programName: req.body.name
      });

      if (err instanceof Error && err.message.includes('not found')) {
        return res.status(404).json(
          error(ErrorCodes.NOT_FOUND, 'Template not found')
        );
      }

      if (err instanceof Error && err.message.includes('no longer available')) {
        return res.status(410).json(
          error('gone', 'Template is no longer available')
        );
      }
      
      return res.status(500).json(
        error(
          ErrorCodes.INTERNAL_ERROR,
          'Failed to create program from template',
          err instanceof Error ? err.message : undefined
        )
      );
    }
  },

  // POST /api/v2/templates - Create new template (admin only)
  createTemplate: async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(validationError(errors.array()));
      }

      if (!req.user?.id) {
        return res.status(401).json(
          error(ErrorCodes.UNAUTHORIZED, "User not authenticated")
        );
      }

      // Check if user is admin
      if (req.user.role !== 'ADMIN') {
        return res.status(403).json(
          error(ErrorCodes.FORBIDDEN, "Admin privileges required")
        );
      }

      const adminUserId = req.user.id;
      const templateData: CreateTemplateRequest = req.body;

      const template = await programTemplateService.createTemplate(adminUserId, templateData);

      return res.status(201).json(
        success(template, 'Template created successfully')
      );
    } catch (err) {
      logger.error(`Error in createTemplate controller: ${err instanceof Error ? err.message : 'Unknown error'}`, {
        stack: err instanceof Error ? err.stack : undefined,
        adminUserId: req.user?.id,
        templateName: req.body.name
      });

      if (err instanceof Error && (
        err.message.includes('required') || 
        err.message.includes('must have')
      )) {
        return res.status(400).json(
          error(ErrorCodes.VALIDATION_FAILED, err.message)
        );
      }
      
      return res.status(500).json(
        error(
          ErrorCodes.INTERNAL_ERROR,
          'Failed to create template',
          err instanceof Error ? err.message : undefined
        )
      );
    }
  },

  // PUT /api/v2/templates/:id - Update template (admin only)
  updateTemplate: async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(validationError(errors.array()));
      }

      if (!req.user?.id) {
        return res.status(401).json(
          error(ErrorCodes.UNAUTHORIZED, "User not authenticated")
        );
      }

      // Check if user is admin
      if (req.user.role !== 'ADMIN') {
        return res.status(403).json(
          error(ErrorCodes.FORBIDDEN, "Admin privileges required")
        );
      }

      const templateId = Number(req.params.id);
      const updateData: UpdateTemplateRequest = req.body;

      const updatedTemplate = await programTemplateService.updateTemplate(templateId, updateData);

      return res.status(200).json(
        success(updatedTemplate, 'Template updated successfully')
      );
    } catch (err) {
      logger.error(`Error in updateTemplate controller: ${err instanceof Error ? err.message : 'Unknown error'}`, {
        stack: err instanceof Error ? err.stack : undefined,
        templateId: req.params.id,
        adminUserId: req.user?.id
      });

      if (err instanceof Error && err.message.includes('not found')) {
        return res.status(404).json(
          error(ErrorCodes.NOT_FOUND, 'Template not found')
        );
      }
      
      return res.status(500).json(
        error(
          ErrorCodes.INTERNAL_ERROR,
          'Failed to update template',
          err instanceof Error ? err.message : undefined
        )
      );
    }
  },

  // DELETE /api/v2/templates/:id - Deactivate template (admin only)
  deleteTemplate: async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(validationError(errors.array()));
      }

      if (!req.user?.id) {
        return res.status(401).json(
          error(ErrorCodes.UNAUTHORIZED, "User not authenticated")
        );
      }

      // Check if user is admin
      if (req.user.role !== 'ADMIN') {
        return res.status(403).json(
          error(ErrorCodes.FORBIDDEN, "Admin privileges required")
        );
      }

      const templateId = Number(req.params.id);
      const deactivatedTemplate = await programTemplateService.deactivateTemplate(templateId);

      return res.status(200).json(
        success(deactivatedTemplate, 'Template deactivated successfully')
      );
    } catch (err) {
      logger.error(`Error in deleteTemplate controller: ${err instanceof Error ? err.message : 'Unknown error'}`, {
        stack: err instanceof Error ? err.stack : undefined,
        templateId: req.params.id,
        adminUserId: req.user?.id
      });

      if (err instanceof Error && err.message.includes('not found')) {
        return res.status(404).json(
          error(ErrorCodes.NOT_FOUND, 'Template not found')
        );
      }
      
      return res.status(500).json(
        error(
          ErrorCodes.INTERNAL_ERROR,
          'Failed to deactivate template',
          err instanceof Error ? err.message : undefined
        )
      );
    }
  }
};