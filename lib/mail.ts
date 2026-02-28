import nodemailer from 'nodemailer';
import { absoluteUrl } from './utils';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export function generateEmailHtml(options: {
  title: string;
  badge?: { text: string; variant: 'warning' | 'info' | 'success' };
  bodyParagraphs: string[];
  highlightBox?: { title: string; content: string };
  actionPath?: string;
  actionLabel?: string;
  footerText?: string;
}) {
  const badgeHtml = options.badge ? `
      <div class="badge badge-${options.badge.variant}">${options.badge.text}</div>
  ` : '';

  const highlightHtml = options.highlightBox ? `
      <div class="course-card">
        <span class="course-title">${options.highlightBox.title}</span>
        <span style="color: #71717a;">${options.highlightBox.content}</span>
      </div>
  ` : '';

  const buttonsHtml = (options.actionPath && options.actionLabel) ? `
      <div style="margin-top: 32px; text-align: center;">
        <p style="font-size: 14px; color: #52525b; margin-bottom: 8px;">Access via Live Site:</p>
        <a href="https://kyren.vercel.app${options.actionPath}" class="button">${options.actionLabel}</a>
        
        <p style="font-size: 14px; color: #52525b; margin-top: 16px; margin-bottom: 8px;">Access via Localhost (Testing):</p>
        <a href="http://localhost:3000${options.actionPath}" class="button button-outline">${options.actionLabel} (Local)</a>
      </div>
  ` : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${options.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e4e4e7; }
    .header { background-color: #000000; padding: 24px; text-align: center; }
    .logo { height: 40px; margin: 0 auto; display: block; filter: invert(1); }
    .content { padding: 32px; color: #18181b; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 16px; }
    .badge-warning { background-color: #fef2f2; color: #ef4444; border: 1px solid #fecaca; }
    .badge-info { background-color: #eff6ff; color: #3b82f6; border: 1px solid #bfdbfe; }
    .badge-success { background-color: #f0fdf4; color: #22c55e; border: 1px solid #bbf7d0; }
    h1 { margin: 0 0 16px 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; color: #09090b; }
    p { margin: 0 0 16px 0; line-height: 1.6; color: #52525b; }
    .course-card { background-color: #fafafa; border: 1px solid #e4e4e7; border-radius: 8px; padding: 16px; margin: 24px 0; }
    .course-title { font-weight: 600; color: #09090b; margin-bottom: 4px; display: block; }
    .footer { background-color: #fafafa; padding: 24px; text-align: center; font-size: 12px; color: #a1a1aa; border-top: 1px solid #e4e4e7; }
    .button { display: inline-block; background-color: #000000; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 14px; margin-top: 8px; }
    .button-outline { background-color: #ffffff; color: #000000; border: 1px solid #e4e4e7; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <!-- Using CID for embedded logo -->
      <img src="cid:kyren-logo" alt="Kyren" class="logo" />
    </div>
    <div class="content">
      ${badgeHtml}
      <h1>${options.title}</h1>
      <p>Hello,</p>
      ${options.bodyParagraphs.map(p => `<p>${p}</p>`).join('\n      ')}
      
      ${highlightHtml}

      ${buttonsHtml}
    </div>
    <div class="footer">
      <p style="margin-bottom: 8px;">&copy; ${new Date().getFullYear()} Kyren Learning Platform. All rights reserved.</p>
      <p>${options.footerText || "This is an automated notification."}</p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendEmail({
  to,
  subject,
  text,
  html,
  attachments = [],
}: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: any[];
}) {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Kyren" <no-reply@kyren.com>',
      to,
      subject,
      text,
      html: html || text,
      attachments: [
        ...attachments,
        {
          filename: 'icon.ico',
          path: process.cwd() + '/app/icon.ico',
          cid: 'kyren-logo'
        }
      ]
    });
    console.log("Email sent: %s", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error };
  }
}

export async function sendCourseGeneratedEmail(
  userEmail: string,
  userName: string,
  courseTitle: string,
  courseId: string
) {
  const actionPath = `/dashboard/courses/${courseId}`;

  return sendEmail({
    to: userEmail,
    subject: `Your course "${courseTitle}" is ready! 📚`,
    text: `Hi ${userName},\n\nGreat news! Your course "${courseTitle}" has been successfully generated and is ready to explore.\n\nVerify in your dashboard.\n\nHappy learning!\n\nThe Kyren Team`,
    html: generateEmailHtml({
      title: "Your Course is Ready!",
      badge: { text: "Success", variant: "success" },
      bodyParagraphs: [
        `Great news! Your custom course has been successfully generated by our AI and is now available in your personal library.`,
        `You can jump right in and start learning, taking quizzes, and interacting with the AI tutor.`
      ],
      highlightBox: {
        title: "Generated Course",
        content: `"${courseTitle}"`
      },
      actionPath: actionPath,
      actionLabel: "View Your Course",
      footerText: "This is an automated course generation notification."
    })
  });
}
export async function sendProPlanConfirmation(userEmail: string, userName: string) {
  const dashboardUrl = absoluteUrl('/dashboard');

  return sendEmail({
    to: userEmail,
    subject: `Welcome to Kyren Pro! 🌟`,
    text: `Hi ${userName},\n\nThank you for upgrading to Kyren Pro! Your account has been successfully upgraded.\n\nYou now have access to all premium features.\n\nThe Kyren Team`,
    html: generateEmailHtml({
      title: "Welcome to Kyren Pro!",
      badge: { text: "Subscription Upgrade", variant: "info" },
      bodyParagraphs: [
        `Thank you for upgrading to <strong>Kyren Pro</strong>! Your account has been successfully upgraded.`,
        `You now have access to all premium features, including unlimited course generation, priority access to new AI models, and advanced learning analytics.`
      ],
      actionPath: '/dashboard',
      actionLabel: "Go to Dashboard",
      footerText: "Thank you for supporting the Kyren platform."
    })
  });
}

export async function sendWelcomeEmail(userEmail: string, userName: string) {
  const dashboardUrl = absoluteUrl('/dashboard');

  return sendEmail({
    to: userEmail,
    subject: `Welcome to Kyren! 👋`,
    text: `Hi ${userName},\n\nWelcome to Kyren! We're thrilled to have you on board.\n\nStart exploring personalized learning and amazing courses today.\n\nThe Kyren Team`,
    html: generateEmailHtml({
      title: "Welcome to Kyren!",
      badge: { text: "New Account", variant: "info" },
      bodyParagraphs: [
        `We're thrilled to have you here! Kyren is your platform for AI-generated courses, personalized learning paths, and peer-to-peer tutoring.`,
        `Feel free to jump right in and start generating your first course, or connect with peers across the globe.`
      ],
      actionPath: '/dashboard',
      actionLabel: "Access Your Dashboard",
      footerText: "Happy Learning from the Kyren Team."
    })
  });
}

export async function sendPlanCancellationEmail(userEmail: string, userName: string) {
  return sendEmail({
    to: userEmail,
    subject: `Your Kyren Pro Plan has Ended`,
    text: `Hi ${userName},\n\nYour Kyren Pro subscription has ended or been canceled. Your account has been securely moved back to the Normal Free Plan.\n\nThe Kyren Team`,
    html: generateEmailHtml({
      title: "Your Pro Plan has Ended",
      badge: { text: "Subscription Change", variant: "warning" },
      bodyParagraphs: [
        `Your Kyren Pro subscription has ended or been canceled. Your account has been securely moved back to the <strong>Free Plan</strong>.`,
        `You still have access to our core free features. If you ever need unlimited course generation again, upgrading is easy!`
      ],
      actionPath: '/dashboard',
      actionLabel: "Go to Dashboard",
      footerText: "Thank you for being with us."
    })
  });
}

