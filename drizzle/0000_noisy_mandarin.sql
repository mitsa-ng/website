CREATE TABLE "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"key_hash" text NOT NULL,
	"key_prefix" text NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"last_used_at" timestamp,
	"revoked" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"message" text NOT NULL,
	"notified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title_zh" text NOT NULL,
	"title_en" text NOT NULL,
	"excerpt_zh" text DEFAULT '' NOT NULL,
	"excerpt_en" text DEFAULT '' NOT NULL,
	"content_zh" text DEFAULT '' NOT NULL,
	"content_en" text DEFAULT '' NOT NULL,
	"draft" boolean DEFAULT true,
	"published" boolean DEFAULT false,
	"published_at" timestamp,
	"publish_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"title_zh" text NOT NULL,
	"title_en" text NOT NULL,
	"description_zh" text DEFAULT '' NOT NULL,
	"description_en" text DEFAULT '' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"link" text,
	"draft" boolean DEFAULT true,
	"published" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" serial PRIMARY KEY NOT NULL,
	"title_zh" text NOT NULL,
	"title_en" text NOT NULL,
	"description_zh" text DEFAULT '' NOT NULL,
	"description_en" text DEFAULT '' NOT NULL,
	"price" text DEFAULT '' NOT NULL,
	"icon" text DEFAULT '' NOT NULL,
	"featured" boolean DEFAULT false,
	"published" boolean DEFAULT false,
	"draft" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
