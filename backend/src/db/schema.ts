import {
  boolean,
  integer,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  passwd_hash: varchar({ length: 322 }).notNull().unique(),
  created_at: timestamp(),
  updated_at: timestamp(),
});

export const polls = pgTable("polls", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  user_id: integer().references(() => users.id),
  description: varchar({ length: 322 }),
  title: varchar({ length: 50 }).notNull(),
  slug: varchar({ length: 50 }).notNull(),
  is_anonymous: boolean().notNull().default(false),
  is_active: boolean().notNull().default(false),
  expires_at: timestamp(),
  published_at: timestamp(),
  created_at: timestamp(),
  updated_at: timestamp(),
});

export const questions = pgTable('questions', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  poll_id: integer().references(() => polls.id),
  body: varchar({ length: 322 }).notNull(),
  is_mandatory: boolean().default(true),
  display_order: integer().notNull(),
  created_at: timestamp(),
})

export const options = pgTable('options', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  ques_id: integer().references(() => questions.id),
  text: varchar({ length: 255 }).notNull(),
  created_at: timestamp(),
})

export const responses = pgTable('responses', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  poll_id: integer().references(() => polls.id),
  option_id: integer().references(() => options.id),
  session_token: varchar({ length: 255}).notNull(),
  submitted_at: timestamp(),
})

export const response_ans = pgTable('response_ans', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  ques_id: integer().references(() => questions.id),
  response_id: integer().references(() => responses.id),
  option_id: integer().references(() => options.id),
})

export const analytics = pgTable('analytics', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  poll_id: integer().references(() => polls.id),
  option_id: integer().references(() => options.id),
  count: integer(),
  recorded_at: timestamp()
})
