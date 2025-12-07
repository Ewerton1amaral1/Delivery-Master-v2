import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getStore = async (req: Request, res: Response) => {
    try {
        // @ts-ignore - Confident that authMiddleware attaches user with storeId
        const storeId = req.user?.storeId;

        if (!storeId) {
            res.status(400).json({ error: 'Store context missing' });
            return;
        }

        const store = await prisma.store.findUnique({ where: { id: storeId } });

        if (!store) {
            res.status(404).json({ error: 'Store not found' });
            return;
        }

        // Parse JSON fields safely
        const parsedSettings = {
            ...store,
            deliveryRanges: typeof store.deliveryRanges === 'string' ? JSON.parse(store.deliveryRanges || '[]') : store.deliveryRanges,
            driverFeeRanges: typeof store.driverFeeRanges === 'string' ? JSON.parse(store.driverFeeRanges || '[]') : store.driverFeeRanges,
            integrations: typeof store.integrations === 'string' ? JSON.parse(store.integrations || '{}') : store.integrations,
        };

        res.json(parsedSettings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch store settings' });
    }
};

export const updateStore = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const storeId = req.user?.storeId;
        const { id, deliveryRanges, driverFeeRanges, integrations, ...data } = req.body;

        if (!storeId) {
            res.status(400).json({ error: 'Store context missing' });
            return;
        }

        const updated = await prisma.store.update({
            where: { id: storeId },
            data: {
                ...data, // name, address, etc.
                deliveryRanges: JSON.stringify(deliveryRanges || []),
                driverFeeRanges: JSON.stringify(driverFeeRanges || []),
                integrations: JSON.stringify(integrations || {})
            }
        });

        // Parse back for response
        const parsedSettings = {
            ...updated,
            deliveryRanges: typeof updated.deliveryRanges === 'string' ? JSON.parse(updated.deliveryRanges || '[]') : updated.deliveryRanges,
            driverFeeRanges: typeof updated.driverFeeRanges === 'string' ? JSON.parse(updated.driverFeeRanges || '[]') : updated.driverFeeRanges,
            integrations: typeof updated.integrations === 'string' ? JSON.parse(updated.integrations || '{}') : updated.integrations,
        };

        res.json(parsedSettings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update store settings' });
    }
};
