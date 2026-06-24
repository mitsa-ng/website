import { pgTable, serial, text, integer, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const apiKeys = pgTable('api_keys', {
  id: serial('id').primaryKey(),
  keyHash: text('key_hash').notNull(),
  keyPrefix: text('key_prefix').notNull(),
  label: text('label').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  lastUsedAt: timestamp('last_used_at'),
  revoked: boolean('revoked').default(false),
});

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

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),

  titleZh: text('title_zh').notNull(),
  titleEn: text('title_en').notNull(),
  descriptionZh: text('description_zh').notNull().default(''),
  descriptionEn: text('description_en').notNull().default(''),
  tags: jsonb('tags').$type<string[]>().default([]),
  link: text('link'),

  draft: boolean('draft').default(true),
  published: boolean('published').default(false),
  sortOrder: integer('sort_order').default(0),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const services = pgTable('services', {
  id: serial('id').primaryKey(),

  titleZh: text('title_zh').notNull(),
  titleEn: text('title_en').notNull(),
  descriptionZh: text('description_zh').notNull().default(''),
  descriptionEn: text('description_en').notNull().default(''),
  price: text('price').notNull().default(''),
  icon: text('icon').notNull().default(''),

  featured: boolean('featured').default(false),
  published: boolean('published').default(false),
  draft: boolean('draft').default(true),
  sortOrder: integer('sort_order').default(0),

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
