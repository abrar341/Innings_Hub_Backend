import nodemailer from 'nodemailer';
import {
    PASSWORD_RESET_REQUEST_TEMPLATE,
    PASSWORD_RESET_SUCCESS_TEMPLATE,
    VERIFICATION_EMAIL_TEMPLATE,
} from "./emailTemplates.js";
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
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Email sending failed.');
    }
};
