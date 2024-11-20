import nodemailer from 'nodemailer';
import {
    FORGOT_PASSWORD_EMAIL_TEMPLATE,
    PASSWORD_RESET_REQUEST_TEMPLATE,
    PASSWORD_RESET_SUCCESS_TEMPLATE,
    SCORER_WELCOME_EMAIL_TEMPLATE,
    VERIFICATION_EMAIL_TEMPLATE,
    WELCOME_EMAIL_TEMPLATE,
} from "./emailTemplates.js";
import { sendSMS } from '../utils/twilioService.js';
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: "muhammadabrar341@gmail.com",
        pass: "txudzolwidmrntja",
    },
});

// Function to send an email
export const sendVerificationEmail = async (to, verificationCode) => {
    try {
        // Setup email data
        const mailOptions = {
            from: "muhammadabrar341@gmail.com", // sender address
            to: to, // recipient email (make sure this is a valid email address)
            subject: "Verify your email",
            html: VERIFICATION_EMAIL_TEMPLATE.replace("{verificationCode}", verificationCode),
            category: "Email Verification",
        };

        // Send email
        let phone = '+923498512161'
        let message = '22222'
        await sendSMS(phone, verificationCode)
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Email sending failed.');
    }
};

export const sendScorerWelcomeEmail = async (to, name, password) => {
    try {
        // Setup email data
        const mailOptions = {
            from: "muhammadabrar341@gmail.com", // sender address
            to: to, // recipient email
            subject: "Welcome to the Scorer Team",
            html: SCORER_WELCOME_EMAIL_TEMPLATE
                .replace("{scorerName}", name)
                .replace("{scorerEmail}", to)
                .replace("{scorerPassword}", password),
            category: "Scorer Welcome",
        };
        // Send email
        const info = await transporter.sendMail(mailOptions);
        console.log('Welcome email sent: ' + info.response);
    } catch (error) {
        console.error('Error sending welcome email:', error);
        throw new Error('Welcome email sending failed.');
    }
};

export const sendForgotPasswordEmail = async (to, name, newPassword) => {
    try {
        // Setup email data
        const mailOptions = {
            from: "muhammadabrar341@gmail.com", // sender address
            to: to, // recipient email
            subject: "Password Reset Request",
            html: FORGOT_PASSWORD_EMAIL_TEMPLATE
                .replace("{userName}", name)
                .replace("{userEmail}", to)
                .replace("{newPassword}", newPassword),
            category: "Password Reset",
        };
        // Send email
        const info = await transporter.sendMail(mailOptions);
        console.log('Forgot password email sent: ' + info.response);
    } catch (error) {
        console.error('Error sending forgot password email:', error);
        throw new Error('Forgot password email sending failed.');
    }
};


export const sendWelcomeEmail = async (to, name) => {
    try {
        // Setup email data
        const mailOptions = {
            from: "muhammadabrar341@gmail.com", // sender address
            to: to, // recipient email
            subject: "Welcome to Our App!",
            html: WELCOME_EMAIL_TEMPLATE.replace("{name}", name),
            category: "Welcome Email",
        };

        // Send email
        const info = await transporter.sendMail(mailOptions);
        console.log('Welcome email sent: ' + info.response);
    } catch (error) {
        console.error('Error sending welcome email:', error);
        throw new Error('Welcome email sending failed.');
    }
};

