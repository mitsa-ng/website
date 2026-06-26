import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { db } from './db.js';
import { posts, contacts } from './schema.js';
import { eq, and, isNotNull, lte } from 'drizzle-orm';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

async function publishScheduledPosts() {
  try {
    const now = new Date();
    const toPublish = await db.select().from(posts)
      .where(and(
        eq(posts.draft, true),
        isNotNull(posts.publishAt),
        lte(posts.publishAt, now),
      ));

    for (const post of toPublish) {
      await db.update(posts)
        .set({ draft: false, published: true, publishedAt: now, updatedAt: now })
        .where(eq(posts.id, post.id));
      console.log(`Published scheduled post: ${post.slug}`);
    }

    if (toPublish.length > 0) {
      console.log(`Published ${toPublish.length} scheduled posts`);
    }
  } catch (e) {
    console.error('Publish cron error:', e);
  }
}

async function sendContactNotifications() {
  try {
    const unNotified = await db.select().from(contacts)
      .where(and(eq(contacts.notified, false)));

    if (unNotified.length === 0) return;

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const notifyEmail = process.env.NOTIFY_EMAIL;

    if (!smtpHost || !smtpUser || !smtpPass || !notifyEmail) {
      console.log('SMTP not configured, skipping email notifications');
      for (const c of unNotified) {
        await db.update(contacts).set({ notified: true }).where(eq(contacts.id, c.id));
      }
      return;
    }

    let nodemailer: any;
    try {
      nodemailer = await import('nodemailer');
    } catch {
      console.log('nodemailer not available, skipping email');
      for (const c of unNotified) {
        await db.update(contacts).set({ notified: true }).where(eq(contacts.id, c.id));
      }
      return;
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    for (const c of unNotified) {
      try {
        await transporter.sendMail({
          from: smtpUser,
          to: notifyEmail,
          subject: `New Contact: ${c.name}`,
          text: `Name: ${c.name}\nEmail: ${c.email}\nDate: ${c.createdAt}\n\nMessage:\n${c.message}`,
          html: `<h2>New Contact Message</h2>
<p><strong>Name:</strong> ${c.name}</p>
<p><strong>Email:</strong> ${c.email}</p>
<p><strong>Date:</strong> ${c.createdAt}</p>
<hr>
<p>${c.message.replace(/\n/g, '<br>')}</p>`,
        });
        await db.update(contacts).set({ notified: true }).where(eq(contacts.id, c.id));
        console.log(`Notified for contact from: ${c.name}`);
      } catch (err) {
        console.error(`Failed to send email for contact ${c.id}:`, err);
      }
    }
  } catch (e) {
    console.error('Contact notification cron error:', e);
  }
}

cron.schedule('* * * * *', () => {
  publishScheduledPosts();
});

cron.schedule('*/5 * * * *', () => {
  sendContactNotifications();
});

app.listen(PORT, () => {
  console.log(`Render service running on port ${PORT}`);
  console.log('Crons: publish every minute, email every 5 minutes');
});
