import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = new twilio(accountSid, authToken);

export const sendSMS = async () => {
    const message = "511544";
    console.log("Sending SMS with body:", message);

    try {
        const response = await client.messages.create({
            body: message,
            to: process.env.PHONE_NUMBER, // Recipient phone number
            from: process.env.TWILIO_PHONE_NUMBER // Twilio phone number
        });

        console.log('Message sent successfully:', response.sid);
        return response;
    } catch (error) {
        console.error('Error sending SMS:', error.message || error);
        // Gracefully handle the error, e.g., return an error response or log for debugging
        return {
            success: false,
            error: error.message || 'An error occurred while sending SMS'
        };
    }
};
