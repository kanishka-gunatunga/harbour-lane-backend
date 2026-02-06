import { Server, Socket } from 'socket.io';
import db from '../models';
import { ChatOpenAI } from "@langchain/openai";
import { createAgent } from "langchain";
import { DynamicTool, DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { PineconeService, pineconeService } from '../services/pinecone.service';
import { HumanMessage, AIMessage, BaseMessage, SystemMessage } from "@langchain/core/messages";



// OpenAI Setup
const model = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.7,
    openAIApiKey: process.env.OPENAI_API_KEY
});

// --- Tools ---

// --- Tools ---

const transferToLiveAgentTool = new DynamicStructuredTool({
    name: "transfer_to_live_agent",
    description: "Use this tool to transfer the user to a live human agent. Trigger this when: 1. The user explicitly asks for a human/agent. 2. The user has a question you cannot answer based on the provided context (off-topic). 3. The user is frustrated.",
    schema: z.object({
        reason: z.string().describe("The reason for transferring to a live agent.")
    }),
    func: async ({ reason }) => {
        return "HANDOFF_TRIGGERED_ACTION";
    },
});

const tools = [
    new DynamicTool({
        name: "create_complaint_ticket",
        description: "Create a new support ticket/complaint for the customer. Inputs: category, description, priority (Low/Medium/High).",
        func: async (input: string) => {
            try {
                // Parsing input - simplified, assumes JSON or structured text
                // For robustness, usually we'd use StructuredTool or JSON parsing
                const params = parseToolInput(input);
                const ticket = await (db.Ticket as any).create({
                    ticket_number: `TKT-${Date.now()}`,
                    status: 'New',
                    category: params.category || 'General',
                    priority: params.priority || 'Medium',
                    description: params.description || input,
                    customer_id: null, // Would link if context available
                });
                return `Ticket created successfully. Ticket Number: ${ticket.ticket_number}. An agent will review it shortly.`;
            } catch (error) {
                return "Failed to create ticket. Please try again.";
            }
        },
    }),
    new DynamicTool({
        name: "check_ticket_status",
        description: "Check the status of an existing ticket. Input: Ticket Number.",
        func: async (ticket_number: string) => {
            const ticket = await (db.Ticket as any).findOne({ where: { ticket_number: ticket_number.trim() } });
            if (!ticket) return "Ticket not found.";
            return `Ticket ${ticket.ticket_number} is currently: ${ticket.status}.`;
        }
    }),
    new DynamicTool({
        name: "transfer_to_agent",
        description: "Transfer the chat to a live human agent.",
        func: async () => {
            return "TRANSFER_AGENT";
        }
    }),
    transferToLiveAgentTool
];

// Context helper
async function getChatHistory(chat_id: string) {
    const messages = await (db.ChatMessage as any).findAll({
        where: { chat_id },
        order: [['created_at', 'DESC']],
        limit: 10
    });
    return messages.reverse().map((m: any) =>
        m.sender === 'customer' ? new HumanMessage(m.message) : new AIMessage(m.message)
    );
}

function parseToolInput(input: string): any {
    // Very basic parser, reliable agents use Zod schema
    try {
        return JSON.parse(input);
    } catch {
        return { description: input };
    }
}


// RAG Helper
async function getContext(query: string) {
    const embedding = await PineconeService.generateEmbedding(query);
    const matches = await pineconeService.queryVectors(embedding);

    if (!matches || matches.length === 0) return "";

    // De-duplicate and join context
    const context = matches
        .map(m => m.metadata?.text)
        .filter((value, index, self) => self.indexOf(value) === index)
        .join("\n\n---\n\n");

    return context;
}

export async function processBotMessage(chat_id: string, text: string, io?: Server) {
    const session = await (db.ChatSession as any).findOne({ where: { chat_id } });

    try {
        const context = await getContext(text);

        const systemPrompt = `You are the Harbour Lane Assistant, a helpful AI for Harbour Lane Furniture.
        
        STRICT RULES:
        1. Use the provided CONTEXT to answer questions about Harbour Lane products, policies, and services.
        2. GENERAL KNOWLEDGE BAN: Do NOT answer general world questions (e.g., "Capital of India", "Who is the President", "Weather", "Math"). 
           - IF the user asks an off-topic question, you MUST reply: "I apologize, but I do not have information about that. I can only assist with inquiries related to Harbour Lane furniture." AND immediately use the "transfer_to_live_agent" tool to offer human help.
        3. If you cannot find the answer in the context, DO NOT make up info. Instead, say you don't know and use the "transfer_to_live_agent" tool.
        4. If the user explicitly asks for a human/agent, use the "transfer_to_live_agent" tool immediately.

        CONTEXT:
        ${context}
        `;

        const agent = createAgent({
            model: model,
            tools: tools as any,
        }) as any;

        // Note: The createAgent helper in older langchain versions might not support systemMessage directly like this 
        // depending on the agent type. If using OpenAI functions agent, we might need to pass it differently.
        // However, for this setup let's try injecting it as the first message if needed, 
        // or using a proper prompt template if createAgent allows.

        // Better approach with createAgent typically involves prompt templates.
        // Let's manually construct the messages for the invoke to ensure system prompt is used.

        const history = await getChatHistory(chat_id);

        const result = await agent.invoke({
            messages: [
                new SystemMessage(systemPrompt),
                ...history,
                new HumanMessage(text)
            ]
        });

        // Check for Tool Usage in the steps or result
        let botResponse = "";
        let isHandoff = false;

        const messages = result.messages as BaseMessage[];
        if (messages && messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            botResponse = lastMessage.content as string;

            // Check if handoff tool was called
            // @ts-ignore
            if (messages.some(msg => msg._getType() === 'tool' && msg.content.toString().includes('HANDOFF_TRIGGERED_ACTION'))) {
                isHandoff = true;
            }
        } else {
            // Fallback
            botResponse = result.output || result.toString();
        }

        // Also check string content as fallback
        if (botResponse.includes("HANDOFF_TRIGGERED_ACTION") || botResponse.toLowerCase().includes("connecting you to a live agent") || botResponse.includes("TRANSFER_AGENT")) {
            isHandoff = true;
        }

        if (isHandoff) {
            console.log("🚀 Handoff Signal Detected via Tool Output");
            const handoffMsg = "I am connecting you to a live agent now...";
            await session?.update({ status: 'queued' });

            // Send system notification to user
            io?.to(chat_id).emit("agent.handoff", { message: handoffMsg });
            io?.emit("agent.updateQueue");

            // Save the handoff message
            const savedMsg = await (db.ChatMessage as any).create({
                chat_id,
                sender: 'system',
                message: handoffMsg
            });
            io?.to(chat_id).emit("message.new", savedMsg);

        } else {
            // Normal response
            const savedMsg = await (db.ChatMessage as any).create({
                chat_id,
                sender: 'bot',
                message: botResponse
            });

            io?.to(chat_id).emit("message.new", savedMsg);
        }
        return botResponse;

    } catch (error) {
        console.error("Bot Error:", error);

        const errorMsg = "I'm having trouble processing that. Let me connect you to an agent.";

        const savedMsg = await (db.ChatMessage as any).create({
            chat_id,
            sender: 'bot',
            message: errorMsg
        });

        io?.to(chat_id).emit("message.new", savedMsg);
        await session?.update({ status: 'queued' });
        io?.emit("agent.updateQueue");
    }

}

export default function initChatSocket(io: Server) {
    io.on("connection", (socket: Socket) => {
        console.log(`User connected: ${socket.id}`);

        // --- Customer Events ---

        socket.on("join.customer", async (data: any) => {
            const { chat_id } = data;
            socket.join(chat_id);
            console.log(`Socket ${socket.id} joined chat ${chat_id}`);
        });

        socket.on("message.customer", async (data: any) => {
            const { chat_id, text, attachment } = data;

            // 1. Save User Message
            const savedMsg = await (db.ChatMessage as any).create({
                chat_id,
                sender: 'customer',
                message: text,
                attachment
            });

            // 2. Broadcast to Room (for Agent if monitoring, and self)
            io.to(chat_id).emit("message.new", savedMsg);

            // 3. Check Session Status
            const session = await (db.ChatSession as any).findOne({ where: { chat_id } });

            if (session?.status === 'assigned' && session.agent_id) {
                // Find agent socket
                // implementation pending for agent socket mapping
                return;
            }

            if (session?.status === 'bot') {
                // 4. Bot Processing
                // 4. Bot Processing
                await processBotMessage(chat_id, text, io);
            }
        });

        // --- Agent Events ---

        socket.on("join.agent", (data: any) => {
            // Agent joining logic
            console.log("Agent joined");
        });

        socket.on("join.chat", ({ chat_id }: { chat_id: string }) => {
            socket.join(chat_id);
            console.log(`Socket ${socket.id} (Agent) joined chat ${chat_id}`);
        });

        socket.on("agent.accept", async ({ chat_id, agent_id }: { chat_id: string, agent_id: number }) => {
            await (db.ChatSession as any).update({ status: 'assigned', agent_id }, { where: { chat_id } });

            // Notify the agent who accepted (since they might not be in the room yet)
            socket.emit("agent.assigned", { agent_id });

            // Notify the room (customer)
            io.to(chat_id).emit("agent.assigned", { agent_id });

            io.emit("agent.updateQueue");
        });

        socket.on("message.agent", async ({ chat_id, text, sender }: { chat_id: string, text: string, sender: string }) => {
            const savedMsg = await (db.ChatMessage as any).create({ chat_id, sender: sender || 'agent', message: text });
            io.to(chat_id).emit("message.new", savedMsg);
        });

        socket.on("chat.close", async ({ chat_id }: { chat_id: string }) => {
            await (db.ChatSession as any).update({ status: 'closed' }, { where: { chat_id } });
            io.to(chat_id).emit("chat.closed");
            io.emit("agent.updateQueue");
            console.log(`Chat ${chat_id} closed by user`);
        });

        socket.on("disconnect", () => {
            console.log("User disconnected");
        });
    });
}