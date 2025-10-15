import { body } from "express-validator";

export const beginnerProgramValidators = {
  questionnaire: [
    body('age')
      .isInt({ min: 13, max: 100 })
      .withMessage('Age must be between 13 and 100'),
    body('gender')
      .isIn(['male', 'female'])
      .withMessage('Gender must be either "male" or "female"'),
    body('experience')
      .optional()
      .isIn(['none', 'some'])
      .withMessage('Experience must be either "none" or "some"'),
    body('availableTime')
      .isIn(['25-35', '40-50'])
      .withMessage('Available time must be either "25-35" or "40-50"'),
    body('frequency')
      .isIn([2, 3])
      .withMessage('Frequency must be either 2 or 3')
  ],

  createProgram: [
    body('templateId')
      .isInt({ min: 1 })
      .withMessage('Template ID must be a positive integer'),
    body('questionnaireData.age')
      .isInt({ min: 13, max: 100 })
      .withMessage('Age must be between 13 and 100'),
    body('questionnaireData.gender')
      .isIn(['male', 'female'])
      .withMessage('Gender must be either "male" or "female"'),
    body('questionnaireData.frequency')
      .isIn([2, 3])
      .withMessage('Frequency must be either 2 or 3'),
    body('programName')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Program name must be between 1 and 255 characters')
  ]
};