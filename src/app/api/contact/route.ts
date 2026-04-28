import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { name, email, subject, message } = await req.json();

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Configure Nodemailer transporter using standard Gmail SMTP
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'routexpertenterprize@gmail.com', // Your Gmail address
        pass: process.env.EMAIL_APP_PASSWORD, // Your App Password from Google
      },
    });

    // Setup email data
    const mailOptions = {
      from: `"${name}" <${email}>`, // sender address
      to: 'routexpertenterprize@gmail.com', // list of receivers
      subject: `New Enterprise Inquiry: ${subject}`, // Subject line
      text: `You have received a new message from your RouteXpert website.\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message}`, // plain text body
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #06b6d4;">New RouteXpert Inquiry</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <hr style="border: 1px solid #eee;" />
          <p><strong>Message:</strong></p>
          <p style="white-space: pre-wrap;">${message}</p>
        </div>
      `,
    };

    // If no password is provided in ENV, we simulate a successful send for testing purposes
    if (!process.env.EMAIL_APP_PASSWORD) {
      console.log("SIMULATED EMAIL SEND (No EMAIL_APP_PASSWORD found):", mailOptions);
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      return NextResponse.json({ success: true, simulated: true });
    }

    // Actually send mail
    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Email send error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
