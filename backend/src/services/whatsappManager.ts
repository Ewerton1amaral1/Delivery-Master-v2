import { Client, LocalAuth, Message as WpMessage } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import prisma from '../lib/prisma';

export class WhatsappManager {
    private sessions: Map<string, Client> = new Map();
    private qrCodes: Map<string, string> = new Map();
    private statuses: Map<string, 'DISCONNECTED' | 'CONNECTED' | 'QR_READY'> = new Map();

    constructor() {
        console.log('[WhatsappManager] Started.');
    }

    public async getSession(storeId: string): Promise<Client | undefined> {
        return this.sessions.get(storeId);
    }

    public getStatus(storeId: string) {
        return {
            status: this.statuses.get(storeId) || 'DISCONNECTED',
            qrCode: this.qrCodes.get(storeId) || null
        };
    }

    public async initializeStore(storeId: string) {
        if (this.sessions.has(storeId)) {
            return this.sessions.get(storeId);
        }

        console.log(`[WhatsappManager] Initializing session for store: ${storeId}`);
        this.statuses.set(storeId, 'DISCONNECTED');

        const client = new Client({
            authStrategy: new LocalAuth({ clientId: storeId }), // Saves to .wwebjs_auth/session-<storeId>
            puppeteer: {
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process', // <- This one is risky but saves memory. If it crashes, remove it.
                    '--disable-gpu'
                ],
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
            }
        });

        this.sessions.set(storeId, client);

        client.on('qr', async (qr) => {
            console.log(`[Store ${storeId}] QR RECEIVED`);
            try {
                const url = await qrcode.toDataURL(qr);
                this.qrCodes.set(storeId, url);
                this.statuses.set(storeId, 'QR_READY');
            } catch (err) {
                console.error('Error generating QR', err);
            }
        });

        client.on('ready', async () => {
            console.log(`[Store ${storeId}] Client is ready!`);
            this.statuses.set(storeId, 'CONNECTED');
            this.qrCodes.delete(storeId);

            // Save status to DB
            await prisma.store.update({
                where: { id: storeId },
                data: { whatsappStatus: 'CONNECTED' }
            });
        });

        client.on('message', async (msg) => {
            if (msg.fromMe) return;
            this.handleMessage(storeId, msg, client);
        });

        client.on('disconnected', async (reason) => {
            console.log(`[Store ${storeId}] Disconnected:`, reason);
            this.statuses.set(storeId, 'DISCONNECTED');
            await prisma.store.update({
                where: { id: storeId },
                data: { whatsappStatus: 'DISCONNECTED' }
            });
            // Optional: Auto-reconnect or destroy
            // this.sessions.delete(storeId);
        });

        try {
            await client.initialize();
        } catch (error) {
            console.error(`[Store ${storeId}] Failed to initialize client`, error);
        }

        return client;
    }

    private async handleMessage(storeId: string, msg: WpMessage, client: Client) {
        // ... (Logic from old service, but scoped to storeId)
        // We will implement the full bot logic here later or delegate to a BotService
        console.log(`[Store ${storeId}] Message received: ${msg.body}`);
    }
}

export const whatsappManager = new WhatsappManager();
