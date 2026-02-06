import { DataTypes, Model, Sequelize, Optional } from 'sequelize';

interface UserAttributes {
    id: number;
    name: string;
    email: string;
    role: 'Admin' | 'Agent' | 'Supervisor';
    password_hash?: string;
    is_online: boolean;
    created_at?: Date;
    updated_at?: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'password_hash' | 'is_online' | 'created_at' | 'updated_at'> { }

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
    public id!: number;
    public name!: string;
    public email!: string;
    public role!: 'Admin' | 'Agent' | 'Supervisor';
    public password_hash?: string;
    public is_online!: boolean;
    public readonly created_at!: Date;
    public readonly updated_at!: Date;
}

export const UserFactory = (sequelize: Sequelize) => {
    User.init(
        {
            id: {
                type: DataTypes.INTEGER.UNSIGNED,
                autoIncrement: true,
                primaryKey: true,
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            email: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
            },
            role: {
                type: DataTypes.ENUM('Admin', 'Agent'),
                defaultValue: 'Agent',
            },
            password_hash: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            is_online: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
            }
        },
        {
            sequelize,
            tableName: 'users',
            timestamps: true,
            underscored: true,
            charset: 'utf8mb4',
            collate: 'utf8mb4_unicode_ci'
        }
    );
    return User;
};
