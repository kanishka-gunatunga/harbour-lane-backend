import { DataTypes, Model, Sequelize, Optional } from 'sequelize';

interface TicketActivityAttributes {
    id: number;
    ticket_id: number;
    user_id?: number; // User who performed the action (Agent)
    activity_type: 'Comment' | 'Status Change' | 'Reminder' | 'Log';
    details: string;
    created_at?: Date;
}

interface TicketActivityCreationAttributes extends Optional<TicketActivityAttributes, 'id' | 'created_at'> { }

export class TicketActivity extends Model<TicketActivityAttributes, TicketActivityCreationAttributes> implements TicketActivityAttributes {
    public id!: number;
    public ticket_id!: number;
    public user_id?: number;
    public activity_type!: 'Comment' | 'Status Change' | 'Reminder' | 'Log';
    public details!: string;
    public readonly created_at!: Date;
}

export const TicketActivityFactory = (sequelize: Sequelize) => {
    TicketActivity.init(
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            ticket_id: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: false,
            },
            user_id: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: true,
            },
            activity_type: {
                type: DataTypes.ENUM('Comment', 'Status Change', 'Reminder', 'Log'),
                allowNull: false,
            },
            details: {
                type: DataTypes.TEXT,
                allowNull: false,
            }
        },
        {
            sequelize,
            tableName: 'ticket_activities',
            timestamps: true,
            updatedAt: false, // Activities are immutable logs usually
            underscored: true,
        }
    );
    return TicketActivity;
};
