import db from "../models";
import { processBotMessage } from "./socket";

const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

async function sendFacebookReply(psid: any, text: any) {
    const request_body = {
        "recipient": {
            "id": psid
        },
        "message": {
            "text": text,
        }
    };

    try {
        await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request_body)
        });
        console.log(`Sent reply to PSID ${psid}: ${text}`);
    } catch (error) {
        console.error("Error sending Facebook message:", error);
    }
}

export async function handleFacebookMessage(psid: any, received_message: any) {
    const text = received_message.text;

    if (!text) return;

    let session;
    try {
        [session] = await db.ChatSession.findOrCreate({
            where: { chat_id: psid },
            defaults: {
                chat_id: psid,
                status: 'bot',
                channel: 'Facebook', // Track the source
                user_type: 'guest'
            }
        });
    } catch (dbError) {
        console.error("Error finding/creating chat session:", dbError);
        return;
    }

    // 2. Save the customer's message
    await db.ChatMessage.create({
        chat_id: psid,
        sender: "customer",
        message: text,
        is_read: false
    });

    // 3. Process Bot Message directly (no translation)
    const botResult = await processBotMessage(psid, text);

    // processBotMessage returns a string (the response) and handles DB updates for handoff internally
    let finalResponseUser = "";

    if (typeof botResult === 'string') {
        finalResponseUser = botResult;
    } else if (botResult && typeof botResult === 'object' && 'content' in botResult) {
        finalResponseUser = (botResult as any).content;
    }

    // Refresh session to check if status changed (e.g. to 'queue' by processBotMessage)
    await session.reload();

    await db.ChatMessage.create({
        chat_id: psid,
        sender: (session.status === 'queue' || session.status === 'queued') ? "system" : "bot",
        message: finalResponseUser,
        is_read: false
    })

    await sendFacebookReply(psid, finalResponseUser);
}