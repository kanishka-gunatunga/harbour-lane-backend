import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './models';
import initChatSocket from './realtime/socket';
import ticketRoutes from './routes/ticket.routes';
import chatRoutes from './routes/chat.routes';
import authRoutes from './routes/auth.routes';
import ticketActivityRoutes from './routes/ticketActivity.routes';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allow all for dev
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', ticketActivityRoutes); // Mount at /api so paths become /api/tickets/:ticketId/followups
app.use('/api/tickets', ticketRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
    res.send('Harbour Lane Chatbot API');
});

// Database & Server Start
const PORT = process.env.PORT || 4000;

const startServer = async () => {
    try {
        // Sync database (safe mode: assumes tables exist or creates them if missing)
        await db.sequelize.sync({ alter: true });
        console.log("Database synced.");

        initChatSocket(io);

        httpServer.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
    }
};

startServer();
