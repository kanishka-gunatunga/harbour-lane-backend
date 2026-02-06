import { Sequelize } from 'sequelize';
import dbConfig from '../config/db.config';
import { UserFactory } from './user.model';
import { CustomerFactory } from './customer.model';
import { ChatSessionFactory } from './chatSession.model';
import { ChatMessageFactory } from './chatMessage.model';
import { TicketFactory } from './ticket.model';
import { TicketActivityFactory } from './ticketActivity.model';
import { TicketFollowUpFactory } from './ticketFollowUp.model';
import { TicketReminderFactory } from './ticketReminder.model';

const sequelize = new Sequelize(
    dbConfig.DB,
    dbConfig.USER,
    dbConfig.PASSWORD,
    {
        host: dbConfig.HOST,
        dialect: dbConfig.dialect as any,
        pool: {
            max: dbConfig.pool.max,
            min: dbConfig.pool.min,
            acquire: dbConfig.pool.acquire,
            idle: dbConfig.pool.idle,
        },
        logging: false,
    }
);

const User = UserFactory(sequelize);
const Customer = CustomerFactory(sequelize);
const ChatSession = ChatSessionFactory(sequelize);
const ChatMessage = ChatMessageFactory(sequelize);
const Ticket = TicketFactory(sequelize);
const TicketActivity = TicketActivityFactory(sequelize);
const TicketFollowUp = TicketFollowUpFactory(sequelize);
const TicketReminder = TicketReminderFactory(sequelize);

// Associations

// Chat <-> Messages
ChatSession.hasMany(ChatMessage, { foreignKey: 'chat_id', sourceKey: 'chat_id', as: 'messages' });
ChatMessage.belongsTo(ChatSession, { foreignKey: 'chat_id', targetKey: 'chat_id', as: 'session' });

// Ticket Associations
Ticket.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });
Customer.hasMany(Ticket, { foreignKey: 'customer_id', as: 'tickets' });

Ticket.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignee' });
User.hasMany(Ticket, { foreignKey: 'assigned_to', as: 'assigned_tickets' });

Ticket.hasMany(TicketActivity, { foreignKey: 'ticket_id', as: 'activities' });
TicketActivity.belongsTo(Ticket, { foreignKey: 'ticket_id' });

Ticket.hasMany(TicketFollowUp, { foreignKey: 'ticket_id', as: 'followups' });
TicketFollowUp.belongsTo(Ticket, { foreignKey: 'ticket_id' });
TicketFollowUp.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

Ticket.hasMany(TicketReminder, { foreignKey: 'ticket_id', as: 'reminders' });
TicketReminder.belongsTo(Ticket, { foreignKey: 'ticket_id' });
TicketReminder.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// Export the initialized models directly, NOT as typeof Class
const db = {
    Sequelize,
    sequelize,
    User,
    Customer,
    ChatSession,
    ChatMessage,
    Ticket,
    TicketActivity,
    TicketFollowUp,
    TicketReminder
};

export default db;
