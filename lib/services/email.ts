import nodemailer from 'nodemailer';

export async function sendEmail(to: string, subject: string, htmlContent: string) {
  const user = process.env.GMAIL_EMAIL || "thakordharamveer@gmail.com";
  const pass = process.env.GMAIL_APP_PASSWORD;
  const textContent = htmlContent.replace(/<[^>]+>/g, '').trim();

  // If password is not configured, we'll just mock
  if (!pass) {
    console.warn("GMAIL_APP_PASSWORD missing. Mocking email send.");
    console.log(`--- MOCK EMAIL ---
From: ${user}
To: ${to}
Subject: ${subject}
Body (HTML): 
${htmlContent}
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
      text: textContent,
      html: htmlContent
    });
    return true;
  } catch (err) {
    console.error("Nodemailer error:", err);
    return false;
  }
}
