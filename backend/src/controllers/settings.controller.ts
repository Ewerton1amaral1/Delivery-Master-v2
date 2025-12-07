import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getSettings = async (req: Request, res: Response) => {
    try {
        let settings = await prisma.storeSettings.findFirst();
        if (!settings) {
            // Create default if not exists
            settings = await prisma.storeSettings.create({
                data: {
                    id: 'settings',
                    name: 'Delivery Master',
                    address: 'Rua Exemplo, 123',
                    managerPassword: '',
                    deliveryRanges: JSON.stringify([]),
                    driverFeeRanges: JSON.stringify([]),
                    latitude: -23.550520,
                    longitude: -46.633308
                }
            });
        }

        // Parse JSON fields safely
        const parsedSettings = {
            ...settings,
            deliveryRanges: typeof settings.deliveryRanges === 'string' ? JSON.parse(settings.deliveryRanges || '[]') : settings.deliveryRanges,
            driverFeeRanges: typeof settings.driverFeeRanges === 'string' ? JSON.parse(settings.driverFeeRanges || '[]') : settings.driverFeeRanges,
            integrations: typeof settings.integrations === 'string' ? JSON.parse(settings.integrations || '{}') : settings.integrations,
        };

        res.json(parsedSettings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
};

export const updateSettings = async (req: Request, res: Response) => {
    try {
        const { id, deliveryRanges, driverFeeRanges, integrations, ...data } = req.body;

        const updated = await prisma.storeSettings.upsert({
            where: { id: 'settings' },
            update: {
                ...data, // name, address, etc.
                deliveryRanges: JSON.stringify(deliveryRanges || []),
                driverFeeRanges: JSON.stringify(driverFeeRanges || []),
                integrations: JSON.stringify(integrations || {})
            },
            create: {
                id: 'settings',
                ...data,
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
        res.status(500).json({ error: 'Failed to update settings' });
    }
};
