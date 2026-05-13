import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

// Initialize an Ethereal email account for testing
export const initMailer = async () => {
  if (!transporter) {
    // Generate a test account if you don't have real SMTP credentials
    const testAccount = await nodemailer.createTestAccount();
    
    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    console.log(`Nodemailer Ethereal Email Ready: ${testAccount.user}`);
  }
};

export const sendPollExpiryEmail = async (to: string, pollTitle: string, pollUrl: string) => {
  if (!transporter) await initMailer();

  const info = await transporter!.sendMail({
    from: '"PulseBoard" <noreply@pulseboard.local>',
    to,
    subject: `Your Poll "${pollTitle}" has expired!`,
    text: `Your poll "${pollTitle}" has just expired and is no longer accepting new responses. View the final results at: ${pollUrl}`,
    html: `
      <h2>Your Poll "${pollTitle}" has expired!</h2>
      <p>Your poll has just expired and is no longer accepting new responses.</p>
      <p>You can view the final results by visiting the following link:</p>
      <a href="${pollUrl}">${pollUrl}</a>
    `,
  });

  console.log("Expiry email sent: %s", info.messageId);
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
};
