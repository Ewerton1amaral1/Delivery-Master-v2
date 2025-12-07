import { Request, Response } from 'express';
import prisma from '../lib/prisma';

// LIST
export const getSupplies = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const storeId = req.user?.storeId;
        const supplies = await prisma.supplyItem.findMany({
            where: { storeId },
            orderBy: { name: 'asc' }
        });
        res.json(supplies);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch supplies' });
    }
};

// CREATE
export const createSupply = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const storeId = req.user?.storeId;
        if (!storeId) {
            res.status(403).json({ error: 'Missing store context' });
            return;
        }

        const { name, unit, quantity, minQuantity, category } = req.body;
        const supply = await prisma.supplyItem.create({
            data: {
                storeId,
                name,
                unit,
                quantity: parseFloat(quantity || 0),
                minQuantity: parseFloat(minQuantity || 0),
                category
            }
        });
        res.status(201).json(supply);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create supply item' });
    }
};

// UPDATE
export const updateSupply = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, unit, quantity, minQuantity, category } = req.body;
        const supply = await prisma.supplyItem.update({
            where: { id },
            data: {
                name,
                unit,
                quantity: quantity !== undefined ? parseFloat(quantity) : undefined,
                minQuantity: minQuantity !== undefined ? parseFloat(minQuantity) : undefined,
                category
            }
        });
        res.json(supply);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update supply item' });
    }
};

// DELETE
export const deleteSupply = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.supplyItem.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete supply item' });
    }
};
