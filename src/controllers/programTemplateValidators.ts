import { body, param, query } from "express-validator";

export const programTemplateValidators = {
  getTemplates: [
    query('category')
      .optional()
      .isIn(['STRENGTH', 'HYPERTROPHY', 'POWERLIFTING', 'GENERAL'])
      .withMessage('Invalid category. Must be STRENGTH, HYPERTROPHY, POWERLIFTING, or GENERAL'),
    query('difficulty')
      .optional()
      .isIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])
      .withMessage('Invalid difficulty level. Must be BEGINNER, INTERMEDIATE, or ADVANCED'),
    query('goal')
      .optional()
      .isIn(['HYPERTROPHY', 'STRENGTH'])
      .withMessage('Invalid goal. Must be HYPERTROPHY or STRENGTH'),
    query('frequency_per_week')
      .optional()
      .isInt({ min: 1, max: 7 })
      .withMessage('Frequency per week must be between 1 and 7'),
    query('program_type')
      .optional()
      .isIn(['MANUAL', 'AUTOMATED'])
      .withMessage('Invalid program type. Must be MANUAL or AUTOMATED')
  ],

  getTemplateById: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Template ID must be a positive integer')
  ],

  createProgramFromTemplate: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Template ID must be a positive integer'),
    body('name')
      .isString()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Program name is required and must be less than 255 characters'),
    body('start_date')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date')
  ],

  createTemplate: [
    body('name')
      .isString()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Template name is required and must be less than 255 characters'),
    body('description')
      .optional()
      .isString()
      .isLength({ max: 2000 })
      .withMessage('Description must be less than 2000 characters'),
    body('difficulty_level')
      .isIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])
      .withMessage('Difficulty level must be BEGINNER, INTERMEDIATE, or ADVANCED'),
    body('frequency_per_week')
      .isInt({ min: 1, max: 7 })
      .withMessage('Frequency per week must be between 1 and 7'),
    body('duration_weeks')
      .optional()
      .isInt({ min: 1, max: 52 })
      .withMessage('Duration must be between 1 and 52 weeks'),
    body('category')
      .isIn(['STRENGTH', 'HYPERTROPHY', 'POWERLIFTING', 'GENERAL'])
      .withMessage('Category must be STRENGTH, HYPERTROPHY, POWERLIFTING, or GENERAL'),
    body('goal')
      .isIn(['HYPERTROPHY', 'STRENGTH'])
      .withMessage('Goal must be HYPERTROPHY or STRENGTH'),
    body('program_type')
      .isIn(['MANUAL', 'AUTOMATED'])
      .withMessage('Program type must be MANUAL or AUTOMATED'),
    body('template_workouts')
      .isArray({ min: 1 })
      .withMessage('At least one workout is required'),
    body('template_workouts.*.name')
      .isString()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Each workout must have a non-empty name (max 255 characters)'),
    body('template_workouts.*.order')
      .isInt({ min: 1 })
      .withMessage('Workout order must be a positive integer'),
    body('template_workouts.*.template_exercises')
      .isArray({ min: 1 })
      .withMessage('Each workout must have at least one exercise'),
    body('template_workouts.*.template_exercises.*.exercise_id')
      .isInt({ min: 1 })
      .withMessage('Exercise ID must be a positive integer'),
    body('template_workouts.*.template_exercises.*.sets')
      .isInt({ min: 1, max: 20 })
      .withMessage('Sets must be between 1 and 20'),
    body('template_workouts.*.template_exercises.*.reps')
      .isInt({ min: 1, max: 100 })
      .withMessage('Reps must be between 1 and 100'),
    body('template_workouts.*.template_exercises.*.weight')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Weight must be a positive number'),
    body('template_workouts.*.template_exercises.*.order')
      .isInt({ min: 1 })
      .withMessage('Exercise order must be a positive integer'),
    body('template_workouts.*.template_exercises.*.notes')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Exercise notes must be less than 500 characters')
  ],

  updateTemplate: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Template ID must be a positive integer'),
    body('name')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Template name must be less than 255 characters'),
    body('description')
      .optional()
      .isString()
      .isLength({ max: 2000 })
      .withMessage('Description must be less than 2000 characters'),
    body('difficulty_level')
      .optional()
      .isIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])
      .withMessage('Difficulty level must be BEGINNER, INTERMEDIATE, or ADVANCED'),
    body('frequency_per_week')
      .optional()
      .isInt({ min: 1, max: 7 })
      .withMessage('Frequency per week must be between 1 and 7'),
    body('duration_weeks')
      .optional()
      .isInt({ min: 1, max: 52 })
      .withMessage('Duration must be between 1 and 52 weeks'),
    body('category')
      .optional()
      .isIn(['STRENGTH', 'HYPERTROPHY', 'POWERLIFTING', 'GENERAL'])
      .withMessage('Category must be STRENGTH, HYPERTROPHY, POWERLIFTING, or GENERAL'),
    body('goal')
      .optional()
      .isIn(['HYPERTROPHY', 'STRENGTH'])
      .withMessage('Goal must be HYPERTROPHY or STRENGTH'),
    body('program_type')
      .optional()
      .isIn(['MANUAL', 'AUTOMATED'])
      .withMessage('Program type must be MANUAL or AUTOMATED'),
    body('is_active')
      .optional()
      .isBoolean()
      .withMessage('is_active must be a boolean')
  ],

  deleteTemplate: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Template ID must be a positive integer')
  ]
};