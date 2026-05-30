import nodemailer from 'nodemailer';

export async function sendEmail(to: string, subject: string, text: string) {
  const user = process.env.GMAIL_EMAIL;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    console.warn("GMAIL configuration missing. Mocking email send.");
    console.log(`--- MOCK EMAIL ---
To: ${to}
Subject: ${subject}
Body: 
${text}
------------------`);
    return true;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });

  try {
    await transporter.sendMail({
      from: `"Dharamveer" <${user}>`,
      to,
      subject,
      text
    });
    return true;
  } catch (err) {
    console.error("Nodemailer error:", err);
    return false;
  }
}
