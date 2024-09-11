import { MailtrapClient } from "mailtrap";
import dotenv from "dotenv";

dotenv.config();

export const mailtrapClient = new MailtrapClient({
	endpoint: "live.smtp.mailtrap.io",
	token: "3144d9a6ca1e8d65de9ec2e5ca6b0b04",
});

export const sender = {
	email: "muhammadabrar341@gmail.com",
	name: "Abrar",
};
