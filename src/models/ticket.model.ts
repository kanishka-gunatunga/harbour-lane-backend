import { DataTypes, Model, Sequelize, Optional } from 'sequelize';

interface TicketAttributes {
    id: number;
    ticket_number: string; // e.g., TKT-123456
    status: 'New' | 'In Review' | 'Processing' | 'Approval' | 'Completed';
    priority: 'Low' | 'Medium' | 'High';
    category: 'General' | 'Complaint' | 'Suggestion' | 'Technical';
    description: string;
    customer_id?: number;
    assigned_to?: number; // User ID (Agent)
    created_at?: Date;
    updated_at?: Date;
}

interface TicketCreationAttributes extends Optional<TicketAttributes, 'id' | 'status' | 'priority' | 'created_at' | 'updated_at'> { }

export class Ticket extends Model<TicketAttributes, TicketCreationAttributes> implements TicketAttributes {
    public id!: number;
    public ticket_number!: string;
    public status!: 'New' | 'In Review' | 'Processing' | 'Approval' | 'Completed';
    public priority!: 'Low' | 'Medium' | 'High';
    public category!: 'General' | 'Complaint' | 'Suggestion' | 'Technical';
    public description!: string;
    public customer_id?: number;
    public assigned_to?: number;
    public readonly created_at!: Date;
    public readonly updated_at!: Date;
}

export const TicketFactory = (sequelize: Sequelize) => {
    Ticket.init(
        {
            id: {
                type: DataTypes.INTEGER.UNSIGNED,
                autoIncrement: true,
                primaryKey: true,
            },
            ticket_number: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
            },
            status: {
                type: DataTypes.ENUM('New', 'In Review', 'Processing', 'Approval', 'Completed'),
                defaultValue: 'New',
            },
            priority: {
                type: DataTypes.ENUM('Low', 'Medium', 'High'),
                defaultValue: 'Medium',
            },
            category: {
                type: DataTypes.ENUM('General', 'Complaint', 'Suggestion', 'Technical'),
                allowNull: false,
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            customer_id: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: true,
            },
            assigned_to: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: true,
            }
        },
        {
            sequelize,
            tableName: 'tickets',
            timestamps: true,
            underscored: true,
        }
    );
    return Ticket;
};
