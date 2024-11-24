import mongoose from 'mongoose';
import connectDB from './db/index.js'; // Adjust the path to your database connection
import inquirer from 'inquirer';
import { User } from './models/user.model.js';

const createAdmin = async () => {
    try {
        await connectDB();

        // Check if an admin already exists
        const existingAdmin = await User.findOne({ role: 'admin' });
        if (existingAdmin) {
            console.log("❌ An admin user already exists. Admin creation is not allowed.");
            process.exit(1);
        }

        // Collect admin details via CLI
        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'name',
                message: 'Enter the admin name:',
                default: 'Admin User',
            },
            {
                type: 'input',
                name: 'email',
                message: 'Enter the admin email:',
                validate: (input) => {
                    const isValid = /\S+@\S+\.\S+/.test(input);
                    return isValid || 'Please enter a valid email address.';
                },
            },
            {
                type: 'input',
                name: 'username',
                message: 'Enter the admin username:',
                validate: (input) => {
                    return input.trim() ? true : 'Username cannot be empty.';
                },
            },
            {
                type: 'password',
                name: 'password',
                message: 'Enter the admin password:',
                mask: '*',
                validate: (input) => {
                    return input.length >= 6 || 'Password must be at least 6 characters.';
                },
            },
        ]);

        // Create the admin user
        const adminUser = new User({
            name: answers.name,
            email: answers.email,
            username: answers.username.toLowerCase(),
            password: answers.password, // Raw password, will be hashed by the `pre("save")` hook
            role: 'admin',
            isVerified: true, // Admin is verified by default
        });

        await adminUser.save();
        console.log(`✅ Admin user created successfully: 
        Name: ${answers.name}
        Email: ${answers.email}
        Username: ${answers.username}`);
        process.exit(0);
    } catch (error) {
        console.error("❌ Failed to create admin user:", error.message);
        process.exit(1);
    }
};

// Run the script
createAdmin();
