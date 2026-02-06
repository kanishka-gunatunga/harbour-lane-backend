import { DataTypes, Model, Sequelize, Optional } from 'sequelize';

interface CustomerAttributes {
    id: number;
    name: string;
    email?: string;
    mobile?: string;
    platform_id?: string; // ID from FB/Insta/WhatsApp
    address?: string;
    zip_code?: string;
    created_at?: Date;
    updated_at?: Date;
}

interface CustomerCreationAttributes extends Optional<CustomerAttributes, 'id' | 'email' | 'mobile' | 'platform_id' | 'created_at' | 'updated_at'> { }

export class Customer extends Model<CustomerAttributes, CustomerCreationAttributes> implements CustomerAttributes {
    public id!: number;
    public name!: string;
    public email?: string;
    public mobile?: string;
    public platform_id?: string;
    public address?: string;
    public zip_code?: string;
    public readonly created_at!: Date;
    public readonly updated_at!: Date;
}

export const CustomerFactory = (sequelize: Sequelize) => {
    Customer.init(
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
                allowNull: true,
            },
            mobile: {
                type: DataTypes.STRING,
                allowNull: true,
                unique: true, // Optional: depends if we allow duplicates
            },
            platform_id: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            address: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            zip_code: {
                type: DataTypes.STRING,
                allowNull: true,
            }
        },
        {
            sequelize,
            tableName: 'customers',
            timestamps: true,
            underscored: true,
        }
    );
    return Customer;
};
