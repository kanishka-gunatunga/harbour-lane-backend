import { DataTypes, Model, Sequelize, Optional } from 'sequelize';

interface TicketReminderAttributes {
    id: number;
    ticket_id: number;
    task_title: string;
    task_date: Date;
    note?: string;
    created_by?: number; // User ID
    created_at?: Date;
    updated_at?: Date;
}

interface TicketReminderCreationAttributes extends Optional<TicketReminderAttributes, 'id' | 'note' | 'created_at' | 'updated_at'> { }

export class TicketReminder extends Model<TicketReminderAttributes, TicketReminderCreationAttributes> implements TicketReminderAttributes {
    public id!: number;
    public ticket_id!: number;
    public task_title!: string;
    public task_date!: Date;
    public note!: string;
    public created_by?: number;
    public readonly created_at!: Date;
    public readonly updated_at!: Date;
}

export const TicketReminderFactory = (sequelize: Sequelize) => {
    TicketReminder.init(
        {
            id: {
                type: DataTypes.INTEGER.UNSIGNED,
                autoIncrement: true,
                primaryKey: true,
            },
            ticket_id: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: false,
            },
            task_title: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            task_date: {
                type: DataTypes.DATEONLY,
                allowNull: false,
            },
            note: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            created_by: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: true,
            }
        },
        {
            sequelize,
            tableName: 'ticket_reminders',
            timestamps: true,
            underscored: true,
        }
    );
    return TicketReminder;
};
