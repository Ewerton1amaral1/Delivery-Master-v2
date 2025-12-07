import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getClients = async (req: Request, res: Response) => {
    try {
        const clients = await prisma.client.findMany({
            include: { addresses: true },
            orderBy: { name: 'asc' }
        });
        res.json(clients);
    } catch (error) {
        console.error("Error fetching clients", error);
        res.status(500).json({ error: 'Failed to fetch clients' });
    }
};

export const createClient = async (req: Request, res: Response) => {
    try {
        const { name, phone, email, address, preferences, distanceKm } = req.body; // Expanded fields

        // Prepare Address Data if present
        let addressCreate;
        if (address && address.street) { // Minimal validation
            addressCreate = {
                create: {
                    street: address.street,
                    number: address.number || 'S/N',
                    neighborhood: address.neighborhood || '',
                    city: address.city || '',
                    zipCode: address.zipCode || '',
                    reference: address.reference || '',
                    formatted: address.formatted || '',
                    complement: address.complement || ''
                }
            };
        }

        const client = await prisma.client.create({
            data: {
                name,
                phone,
                email,
                preferences,
                // If distanceKm is passed (not in schema? check schema. Client has distanceKm? No, it was added in Frontend types but not schema visible above. Wait, let me check schema again. Line 53-65. No distanceKm in schema. It's safe to ignore or Add it. I'll ignore for now to avoid migration).
                // Actually step 1060 schema lines 52-65: walletBalance, preferences, createdAt... NO distanceKm.
                // So I will NOT save distanceKm.
                addresses: addressCreate
            },
            include: { addresses: true }
        });
        res.json(client);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create client' });
    }
};

export const updateClient = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, phone, email, address } = req.body;

        // 1. Update basic info
        const client = await prisma.client.update({
            where: { id },
            data: { name, phone, email },
            include: { addresses: true }
        });

        // 2. Handle Address (Upsert Logic - Simplistic: Update the first one or Create)
        if (address && address.street) {
            const existingAddress = client.addresses[0]; // Assuming single/primary address for now

            if (existingAddress) {
                await prisma.address.update({
                    where: { id: existingAddress.id },
                    data: {
                        street: address.street,
                        number: address.number,
                        neighborhood: address.neighborhood,
                        city: address.city,
                        zipCode: address.zipCode,
                        reference: address.reference,
                        formatted: address.formatted
                    }
                });
            } else {
                await prisma.address.create({
                    data: {
                        clientId: id,
                        street: address.street,
                        number: address.number || 'S/N',
                        neighborhood: address.neighborhood || '',
                        city: address.city || '',
                        zipCode: address.zipCode || '',
                        reference: address.reference || '',
                        formatted: address.formatted || ''
                    }
                });
            }
        }

        // Refetch to return full data
        const updated = await prisma.client.findUnique({ where: { id }, include: { addresses: true } });
        res.json(updated);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update client' });
    }
};

export const deleteClient = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // Delete related addresses first
        await prisma.address.deleteMany({ where: { clientId: id } });
        await prisma.client.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete client' });
    }
};
