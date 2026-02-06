import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import db from '../models';

const User = db.User;

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ message: "Email and password are required" });
            return;
        }

        const user = await User.findOne({ where: { email } });

        if (!user) {
            res.status(401).json({ message: "Invalid email or password" });
            return;
        }

        if (!user.password_hash) {
            res.status(401).json({ message: "Invalid email or password" });
            return;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            res.status(401).json({ message: "Invalid email or password" });
            return;
        }

        // Return user info (excluding password)
        const userData = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        };

        res.status(200).json(userData);

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password) {
            res.status(400).json({ message: "Name, email, and password are required" });
            return;
        }

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            res.status(400).json({ message: "Email already in use" });
            return;
        }

        const password_hash = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            name,
            email,
            role: role || 'Agent',
            password_hash,
            is_online: false
        });

        res.status(201).json({
            message: "User registered successfully",
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role
            }
        });

    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
