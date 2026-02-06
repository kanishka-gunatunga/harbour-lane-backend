import { Request, Response } from 'express';
import db from '../models';

export const startChat = async (req: Request, res: Response) => {
    try {
        const { channel, user_type, name, mobile } = req.body;

        // Generate a simple unique chat ID
        const chat_id = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const session = await (db.ChatSession as any).create({
            chat_id,
            status: 'bot',
            channel: channel || 'Web',
            user_type: user_type || 'guest',
            customer_name: name,
            customer_contact: mobile,
            priority: 0,
            unread_count: 0
        });

        res.json(session);
    } catch (error) {
        console.error("Error starting chat:", error);
        res.status(500).json({ message: "Failed to start chat session" });
    }
};

export const requestAgent = async (req: Request, res: Response) => {
    try {
        const { chat_id } = req.params;
        const { priority } = req.body;
        const session = await (db.ChatSession as any).findOne({ where: { chat_id } });
        if (!session) return res.status(404).json({ message: "Session not found" });

        await session.update({ status: 'queued', priority: priority || 0 });
        res.json({ message: "Requested agent", session });
    } catch (error) {
        res.status(500).json({ message: "Error requesting agent", error });
    }
};

export const getQueue = async (req: Request, res: Response) => {
    try {
        const { agent_id } = req.query;
        // Logic to filter by skills could go here
        const sessions = await (db.ChatSession as any).findAll({
            where: { status: 'queued' },
            order: [['priority', 'DESC'], ['createdAt', 'ASC']]
        });
        res.json(sessions);
    } catch (error) {
        res.status(500).json({ message: "Error fetching queue", error });
    }
};

export const assignChat = async (req: Request, res: Response) => {
    try {
        const { chat_id } = req.params;
        const { user_id } = req.body; // Agent ID

        const session = await (db.ChatSession as any).findOne({ where: { chat_id } });
        if (!session) return res.status(404).json({ message: "Session not found" });

        await session.update({ status: 'assigned', agent_id: user_id });
        res.json({ message: "Chat assigned", session });
    } catch (error) {
        res.status(500).json({ message: "Error assigning chat", error });
    }
};

export const closeChat = async (req: Request, res: Response) => {
    try {
        const { chat_id } = req.params;
        const session = await (db.ChatSession as any).findOne({ where: { chat_id } });
        if (!session) return res.status(404).json({ message: "Session not found" });

        await session.update({ status: 'closed' });
        res.json({ message: "Chat closed" });
    } catch (error) {
        res.status(500).json({ message: "Error closing chat", error });
    }
};

export const getMessages = async (req: Request, res: Response) => {
    try {
        const { chat_id } = req.params;
        const messages = await (db.ChatMessage as any).findAll({
            where: { chat_id },
            order: [['createdAt', 'ASC']],
            include: [{ model: db.ChatSession, as: 'session' }]
        });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: "Error fetching messages", error });
    }
};

export const getAssignedChats = async (req: Request, res: Response) => {
    try {
        const { user_id } = req.params;
        const sessions = await (db.ChatSession as any).findAll({
            where: { status: 'assigned', agent_id: user_id },
            order: [['updatedAt', 'DESC']]
        });
        res.json(sessions);
    } catch (error) {
        res.status(500).json({ message: "Error fetching assigned chats", error });
    }
};

export const rateAgent = async (req: Request, res: Response) => {
    try {
        const { chat_id } = req.params;
        const { rating, message } = req.body;

        await (db.ChatSession as any).update(
            { agent_rating: rating, rating_message: message },
            { where: { chat_id } }
        );
        res.json({ message: "Rating submitted" });
    } catch (error) {
        res.status(500).json({ message: "Error submitting rating", error });
    }
};

export const uploadFile = async (req: Request, res: Response) => {
    // Assuming multer middleware handled the file
    const file = (req as any).file;
    if (!file) return res.status(400).json({ message: "No file uploaded" });

    // In a real app, upload to S3 or similar. Here we assume local serve
    const url = `/uploads/${file.filename}`;
    res.json({ url, filename: file.originalname });
};

export const verifyCustomer = async (req: Request, res: Response) => {
    // Mock verification
    const { phone_number } = req.body;
    // Check DB for customer...
    res.json({ customer_name: "John Doe", email: "j***@example.com" });
};

export const verifyOtp = async (req: Request, res: Response) => {
    // Mock OTP
    const { phone_number, otp } = req.body;
    if (otp === "123456") {
        res.json({ verified: true });
    } else {
        res.status(400).json({ message: "Invalid OTP" });
    }
};

export const upgradeSession = async (req: Request, res: Response) => {
    try {
        const { chat_id } = req.params;
        const { name, mobile } = req.body;
        await (db.ChatSession as any).update(
            { user_type: 'registered', customer_name: name, customer_contact: mobile },
            { where: { chat_id } }
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: "Error upgrading session", error });
    }
}

// --- Facebook Webhook ---

/**
 * GET /api/chat/webhook
 * Verifies the webhook subscription.
 */
export const handleFacebookWebhook = (req: Request, res: Response) => {
    const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN;

    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400); // Bad Request if parameters missing
    }
};

/**
 * POST /api/chat/webhook
 * Handles incoming messages from Facebook.
 */
import { handleFacebookMessage } from '../realtime/facebook';

export const handleFacebookEvent = async (req: Request, res: Response) => {
    const body = req.body;

    // Check if this is an event from a page subscription
    if (body.object === 'page') {

        // Iterate over each entry - there may be multiple if batched
        for (const entry of body.entry) {
            // Get the webhook event. entry.messaging is an array, usually containing one event
            const webhook_event = entry.messaging[0];
            // console.log("Received webhook event:", webhook_event);

            const sender_psid = webhook_event.sender.id;

            if (webhook_event.message) {
                // It's a message
                await handleFacebookMessage(sender_psid, webhook_event.message);
            }
            // Add other event types here if needed (postback, delivery, etc)
        }

        // Return a '200 OK' response to all events
        res.status(200).send('EVENT_RECEIVED');

    } else {
        // Return a '404 Not Found' if event is not from a page subscription
        res.sendStatus(404);
    }
};