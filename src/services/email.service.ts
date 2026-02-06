import nodemailer from 'nodemailer';

export class EmailService {
    private transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.MAIL_HOST,
            port: Number(process.env.MAIL_PORT),
            secure: process.env.MAIL_ENCRYPTION === 'ssl', // true for 465, false for other ports
            auth: {
                user: process.env.MAIL_USERNAME,
                pass: process.env.MAIL_PASSWORD,
            },
        });
    }

    async sendTicketConfirmation(to: string, ticketNumber: string, customerName: string) {
        try {
            const info = await this.transporter.sendMail({
                from: `"${process.env.MAIL_FROM_NAME || 'Harbour Lane Support'}" <${process.env.MAIL_USERNAME}>`,
                to,
                subject: `Ticket Created - ${ticketNumber}`,
                html: `
                    <div style="font-family: Arial, sans-serif; color: #333;">
                        <h2>Hello ${customerName},</h2>
                        <p>Thank you for contacting Harbour Lane Support.</p>
                        <p>We have received your inquiry and a support ticket has been created for you.</p>
                        <br/>
                        <p><strong>Ticket Number:</strong> ${ticketNumber}</p>
                        <br/>
                        <p>Our team will review your request and get back to you shortly.</p>
                        <br/>
                        <p>Best Regards,</p>
                        <p>Harbour Lane Team</p>
                    </div>
                `,
            });
            console.log("Email sent: %s", info.messageId);
            return true;
        } catch (error) {
            console.error("Error sending email:", error);
            return false;
        }
    }
}

export const emailService = new EmailService();
