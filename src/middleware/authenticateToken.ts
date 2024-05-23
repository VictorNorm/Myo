import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

function authenticateToken(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.status(401).json({data: {
        "message": "Only logged in users can access this route, please log in."
    }});

    jwt.verify(token, process.env.JWT_SECRET!, (err, user) => {
        if (err) return res.sendStatus(403); // Token is no longer valid
        req.user = user; 
        next();
    });
}

export default authenticateToken;