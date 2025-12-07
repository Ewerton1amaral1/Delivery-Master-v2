import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET || 'supersecretkey';

export const login = async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body;

        // Find user
        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        // Check pass
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        // Generate token
        const token = jwt.sign({ userId: user.id, role: user.role }, SECRET_KEY, { expiresIn: '1d' });

        res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
};

export const register = async (req: Request, res: Response) => {
    try {
        const { username, password, role, name } = req.body;

        const existing = await prisma.user.findUnique({ where: { username } });
        if (existing) {
            res.status(400).json({ error: 'User already exists' });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                role: role || 'STORE',
                name
            }
        });

        res.status(201).json({ message: 'User created' });
    } catch (error) {
        res.status(500).json({ error: 'Registration failed' });
    }
};
