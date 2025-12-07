import { Request, Response } from 'express';
import { whatsappManager } from '../services/whatsappManager'; // Changed to Manager
import prisma from '../lib/prisma';

export const getStatus = (req: Request, res: Response) => {
    // @ts-ignore
    const storeId = req.user?.storeId;
    if (!storeId) {
        res.status(400).json({ error: 'Store context missing' });
        return;
    }

    // Trigger initialization if not started
    whatsappManager.initializeStore(storeId);

    res.json(whatsappManager.getStatus(storeId));
};

export const getChats = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const storeId = req.user?.storeId;
        const chats = await prisma.chat.findMany({
            where: { storeId },
            include: { messages: { take: 1, orderBy: { timestamp: 'desc' } } },
            orderBy: { lastMessageAt: 'desc' }
        });
        res.json(chats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch chats' });
    }
};

export const getMessages = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const messages = await prisma.message.findMany({
            where: { chatId: id },
            orderBy: { timestamp: 'asc' }
        });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
};

export const sendMessage = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const storeId = req.user?.storeId;
        const { id } = req.params;
        const { message } = req.body;

        const session = await whatsappManager.getSession(storeId);
        if (!session) throw new Error('Session not found');

        const chat = await prisma.chat.findUnique({ where: { id: id } });
        if (!chat) throw new Error('Chat not found');

        await session.sendMessage(chat.remoteJid, message);

        // Save to DB
        await prisma.message.create({
            data: {
                body: message,
                fromMe: true,
                chatId: chat.id
            }
        });

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to send message' });
    }
};
