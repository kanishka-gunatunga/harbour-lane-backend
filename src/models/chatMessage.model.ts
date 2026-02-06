import { DataTypes, Model, Optional, Sequelize } from "sequelize";


export interface ChatMessageAttr {
    id: number;
    chat_id: string; // FK -> chat_sessions.chat_id
    sender: "customer" | "bot" | "agent" | "system";
    message: string;
    attachment?: string | null; // JSON string or URL
    is_read: boolean;
    created_at?: Date;
    updated_at?: Date;
}

interface ChatMessageCreate extends Optional<ChatMessageAttr, "id" | "is_read" | "attachment" | "created_at" | "updated_at"> { }

export class ChatMessage extends Model<ChatMessageAttr, ChatMessageCreate> implements ChatMessageAttr {
    public id!: number;
    public chat_id!: string;
    public sender!: "customer" | "bot" | "agent" | "system";
    public message!: string;
    public attachment?: string | null;
    public is_read!: boolean;
    public readonly created_at!: Date;
    public readonly updated_at!: Date;
}

export const ChatMessageFactory = (sequelize: Sequelize) => {
    ChatMessage.init(
        {
            id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
            chat_id: { type: DataTypes.STRING(255), allowNull: false },
            sender: { type: DataTypes.ENUM("customer", "bot", "agent", "system"), allowNull: false },
            message: { type: DataTypes.TEXT, allowNull: false },
            attachment: { type: DataTypes.JSON, allowNull: true },
            is_read: { type: DataTypes.BOOLEAN, defaultValue: false },
        },
        {
            sequelize,
            tableName: "chat_messages",
            timestamps: true,
            underscored: true,
            charset: 'utf8mb4',
            collate: 'utf8mb4_unicode_ci'
        }
    );
    return ChatMessage;
};

