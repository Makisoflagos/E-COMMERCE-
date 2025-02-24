import nodemailer from 'nodemailer';
import dotenv from 'dotenv';


dotenv.config()

interface EmailOptions {
    to: string;
    subject: string;
    text: string;
    html?: string;
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    }
});

const sendMail = (options: EmailOptions): void => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
    }
    transporter.sendMail(mailOptions, (error, info) => {
        if(error){
            console.error('Error sending email:', error)
        }else{
            console.log('Email sent:', info.response)
        }
    });
};

export default sendMail;