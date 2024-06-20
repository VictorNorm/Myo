import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

function authenticateToken(req: Request, res: Response, next: NextFunction) {

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        console.log('No token provided');
        return res.status(401).json({ data: { "message": "Only logged in users can access this route, please log in." } });
    }

    jwt.verify(token, process.env.JWT_SECRET!, (err, user) => {
        if (err) {
            console.error('Token verification error:', err);
            return res.status(403).json({ data: { "message": "Token is no longer valid or has expired." } });
        }

        req.user = user as any; // Ensure req.user has the correct type
        next();
    });
}

export default authenticateToken;