import type { Request, Response } from "express";
import { validationResult } from "express-validator";
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
        return res.status(400).json({
          success: false,
          errors: errors.array(),
          message: "Validation failed"
        });
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

      return res.status(200).json({
        success: true,
        data: templates,
        message: 'Templates retrieved successfully'
      });
    } catch (error) {
      logger.error(`Error in getTemplates controller: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        stack: error instanceof Error ? error.stack : undefined,
        query: req.query
      });
      
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to retrieve templates'
      });
    }
  },

  // GET /api/v2/templates/:id - Get specific template with full details
  getTemplateById: async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
          message: "Validation failed"
        });
      }

      const templateId = Number(req.params.id);
      const template = await programTemplateService.getTemplateDetails(templateId);

      return res.status(200).json({
        success: true,
        data: template,
        message: 'Template details retrieved successfully'
      });
    } catch (error) {
      logger.error(`Error in getTemplateById controller: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        stack: error instanceof Error ? error.stack : undefined,
        templateId: req.params.id
      });

      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Template not found'
        });
      }

      if (error instanceof Error && error.message.includes('no longer available')) {
        return res.status(410).json({
          success: false,
          error: 'Gone',
          message: 'Template is no longer available'
        });
      }
      
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to retrieve template details'
      });
    }
  },

  // POST /api/v2/templates/:id/create-program - Create program from template
  createProgramFromTemplate: async (req: Request, res: Response) => {
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
        return res.status(401).json({
          success: false,
          error: "Authentication required",
          message: "User not authenticated"
        });
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

      return res.status(201).json(result);
    } catch (error) {
      logger.error(`Error in createProgramFromTemplate controller: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        stack: error instanceof Error ? error.stack : undefined,
        templateId: req.params.id,
        userId: req.user?.id,
        programName: req.body.name
      });

      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Template not found'
        });
      }

      if (error instanceof Error && error.message.includes('no longer available')) {
        return res.status(410).json({
          success: false,
          error: 'Gone',
          message: 'Template is no longer available'
        });
      }
      
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to create program from template'
      });
    }
  },

  // POST /api/v2/templates - Create new template (admin only)
  createTemplate: async (req: Request, res: Response) => {
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
        return res.status(401).json({
          success: false,
          error: "Authentication required",
          message: "User not authenticated"
        });
      }

      // Check if user is admin
      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: "Access denied",
          message: "Admin privileges required"
        });
      }

      const adminUserId = req.user.id;
      const templateData: CreateTemplateRequest = req.body;

      const template = await programTemplateService.createTemplate(adminUserId, templateData);

      return res.status(201).json({
        success: true,
        data: template,
        message: 'Template created successfully'
      });
    } catch (error) {
      logger.error(`Error in createTemplate controller: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        stack: error instanceof Error ? error.stack : undefined,
        adminUserId: req.user?.id,
        templateName: req.body.name
      });

      if (error instanceof Error && (
        error.message.includes('required') || 
        error.message.includes('must have')
      )) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: error.message
        });
      }
      
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to create template'
      });
    }
  },

  // PUT /api/v2/templates/:id - Update template (admin only)
  updateTemplate: async (req: Request, res: Response) => {
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
        return res.status(401).json({
          success: false,
          error: "Authentication required",
          message: "User not authenticated"
        });
      }

      // Check if user is admin
      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: "Access denied",
          message: "Admin privileges required"
        });
      }

      const templateId = Number(req.params.id);
      const updateData: UpdateTemplateRequest = req.body;

      const updatedTemplate = await programTemplateService.updateTemplate(templateId, updateData);

      return res.status(200).json({
        success: true,
        data: updatedTemplate,
        message: 'Template updated successfully'
      });
    } catch (error) {
      logger.error(`Error in updateTemplate controller: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        stack: error instanceof Error ? error.stack : undefined,
        templateId: req.params.id,
        adminUserId: req.user?.id
      });

      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Template not found'
        });
      }
      
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to update template'
      });
    }
  },

  // DELETE /api/v2/templates/:id - Deactivate template (admin only)
  deleteTemplate: async (req: Request, res: Response) => {
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
        return res.status(401).json({
          success: false,
          error: "Authentication required",
          message: "User not authenticated"
        });
      }

      // Check if user is admin
      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: "Access denied",
          message: "Admin privileges required"
        });
      }

      const templateId = Number(req.params.id);
      const deactivatedTemplate = await programTemplateService.deactivateTemplate(templateId);

      return res.status(200).json({
        success: true,
        data: deactivatedTemplate,
        message: 'Template deactivated successfully'
      });
    } catch (error) {
      logger.error(`Error in deleteTemplate controller: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        stack: error instanceof Error ? error.stack : undefined,
        templateId: req.params.id,
        adminUserId: req.user?.id
      });

      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Template not found'
        });
      }
      
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to deactivate template'
      });
    }
  }
};