import nodemailer from "nodemailer";

export function isMailConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.MAIL_FROM,
  );
}

export async function sendEmail({ to, subject, text }) {
  if (!isMailConfigured()) throw new Error("SMTP settings are incomplete.");

  const port = Number(process.env.SMTP_PORT);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    console.log(`Sending mail `);
    return transporter.sendMail({
      from: process.env.MAIL_FROM,
      to,
      subject,
      text,
    });
  } catch (error) {
    console.error(`Mail Sending failed`);
  }
}
