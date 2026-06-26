import { pgTable, serial, text, integer, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  titleZh: text('title_zh').notNull(),
  titleEn: text('title_en').notNull(),
  excerptZh: text('excerpt_zh').notNull().default(''),
  excerptEn: text('excerpt_en').notNull().default(''),
  contentZh: text('content_zh').notNull().default(''),
  contentEn: text('content_en').notNull().default(''),
  draft: boolean('draft').default(true),
  published: boolean('published').default(false),
  publishedAt: timestamp('published_at'),
  publishAt: timestamp('publish_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const contacts = pgTable('contacts', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  message: text('message').notNull(),
  notified: boolean('notified').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});
