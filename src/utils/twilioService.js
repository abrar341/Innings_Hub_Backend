import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = new twilio(accountSid, authToken);

export const sendSMS = () => {
    const message = "511544"
    console.log("body", message);
    client.messages.create({
        body: message,
        to: process.env.PHONE_NUMBER, // Recipient phone number
        from: process.env.TWILIO_PHONE_NUMBER // Twilio phone number
    })
        .then(message => {
            console.log('Message sent:', message.sid);
            return message;
        })
        .catch(err => {
            console.error('Error sending message:', err);
            throw err;
        });
};