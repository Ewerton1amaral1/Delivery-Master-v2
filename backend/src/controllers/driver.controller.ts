import { Request, Response } from 'express';
import prisma from '../lib/prisma';

// LIST
export const getDrivers = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const storeId = req.user?.storeId;
        const drivers = await prisma.driver.findMany({
            where: { storeId },
            orderBy: { name: 'asc' }
        });
        res.json(drivers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch drivers' });
    }
};

// CREATE
export const createDriver = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const storeId = req.user?.storeId;
        if (!storeId) {
            res.status(403).json({ error: 'Missing store context' });
            return;
        }

        const { name, phone, plate, pixKey, dailyRate } = req.body;
        const driver = await prisma.driver.create({
            data: {
                storeId,
                name,
                phone,
                plate,
                pixKey,
                dailyRate: dailyRate ? parseFloat(dailyRate) : null,
                isActive: true
            }
        });
        res.status(201).json(driver);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create driver' });
    }
};

// UPDATE
export const updateDriver = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, phone, plate, pixKey, dailyRate, isActive } = req.body;
        const driver = await prisma.driver.update({
            where: { id },
            data: {
                name,
                phone,
                plate,
                pixKey,
                dailyRate: dailyRate !== undefined ? parseFloat(dailyRate) : undefined,
                isActive
            }
        });
        res.json(driver);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update driver' });
    }
};

// DELETE
export const deleteDriver = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.driver.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete driver' });
    }
};
