import axios from 'axios';
import { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';

dotenv.config();

const checkRecaptcha = async (req: Request, res: Response, next: NextFunction) => {
  const { recaptchaToken } = req.body;

  if (!recaptchaToken) {
    return res.status(400).json({
      data: {
        message: 'reCAPTCHA token is missing.'
      }
    });
  }

  try {
    const response = await axios.post(`https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`);
    console.log('reCAPTCHA response:', response.data);
    if (response.data.success) {
      next();
    } else {
      res.status(400).json({
        data: {
          message: 'Failed reCAPTCHA verification.'
        }
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while verifying reCAPTCHA.");
  }
};

export default checkRecaptcha;