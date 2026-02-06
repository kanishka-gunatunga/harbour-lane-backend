import { DataTypes, Model, Sequelize, Optional } from 'sequelize';

interface TicketFollowUpAttributes {
    id: number;
    ticket_id: number;
    activity: string;
    activity_date: Date;
    created_by?: number; // User ID
    created_at?: Date;
    updated_at?: Date;
}

interface TicketFollowUpCreationAttributes extends Optional<TicketFollowUpAttributes, 'id' | 'created_at' | 'updated_at'> { }

export class TicketFollowUp extends Model<TicketFollowUpAttributes, TicketFollowUpCreationAttributes> implements TicketFollowUpAttributes {
    public id!: number;
    public ticket_id!: number;
    public activity!: string;
    public activity_date!: Date;
    public created_by?: number;
    public readonly created_at!: Date;
    public readonly updated_at!: Date;
}

export const TicketFollowUpFactory = (sequelize: Sequelize) => {
    TicketFollowUp.init(
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
            activity: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            activity_date: {
                type: DataTypes.DATEONLY,
                allowNull: false,
            },
            created_by: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: true,
            }
        },
        {
            sequelize,
            tableName: 'ticket_followups',
            timestamps: true,
            underscored: true,
        }
    );
    return TicketFollowUp;
};
