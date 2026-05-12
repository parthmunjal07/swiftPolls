import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const pollModeEnum = pgEnum("poll_mode", ["live", "async"]);

export const sessionStatusEnum = pgEnum("session_status", [
  "waiting",   
  "active",   
  "ended",
]);

export const users = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  passwd_hash: varchar({ length: 322 }),
  google_id: varchar({ length: 255 }).unique(),
  created_at: timestamp(),
  updated_at: timestamp(),
});

export const polls = pgTable("polls", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  user_id: integer().references(() => users.id),
  title: varchar({ length: 50 }).notNull(),
  description: varchar({ length: 322 }),
  slug: varchar({ length: 50 }).notNull().unique(),   
  mode: pollModeEnum("mode").notNull().default("async"),
  is_anonymous: boolean().notNull().default(false),
  is_active: boolean().notNull().default(true),
  expires_at: timestamp(),                             
  published_at: timestamp(),
  created_at: timestamp(),
  updated_at: timestamp(),
});

export const questions = pgTable("questions", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  poll_id: integer().references(() => polls.id),
  body: varchar({ length: 322 }).notNull(),
  is_mandatory: boolean().default(true),
  display_order: integer().notNull(),
  created_at: timestamp(),
});

export const options = pgTable("options", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  ques_id: integer().references(() => questions.id),
  text: varchar({ length: 255 }).notNull(),
  display_order: integer().notNull().default(0),
  created_at: timestamp(),
});

export const question_settings = pgTable("question_settings", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  ques_id: integer().references(() => questions.id).notNull(),
  show_results_live: boolean().notNull().default(false), 
  time_limit_secs: integer(),
  created_at: timestamp(),
});

export const sessions = pgTable("sessions", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  poll_id: integer().references(() => polls.id).notNull(),
  host_id: integer().references(() => users.id).notNull(),
  room_code: varchar({ length: 8 }).notNull().unique(),
  status: sessionStatusEnum("status").notNull().default("waiting"),
  current_question_index: integer().notNull().default(0),
  results_visible: boolean().notNull().default(false), 
  started_at: timestamp(),
  ended_at: timestamp(),
  created_at: timestamp(),
});

export const session_participants = pgTable("session_participants", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  session_id: integer().references(() => sessions.id).notNull(),
  user_id: integer().references(() => users.id),        
  display_name: varchar({ length: 100 }),
  joined_at: timestamp(),
});

export const responses = pgTable("responses", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  poll_id: integer().references(() => polls.id).notNull(),
  session_id: integer().references(() => sessions.id),  
  user_id: integer().references(() => users.id),        
  session_token: varchar({ length: 255 }).notNull(), 
  submitted_at: timestamp(),
});

export const response_ans = pgTable("response_ans", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  response_id: integer().references(() => responses.id).notNull(),
  ques_id: integer().references(() => questions.id).notNull(),
  option_id: integer().references(() => options.id).notNull(),
});


export const analytics = pgTable("analytics", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  poll_id: integer().references(() => polls.id).notNull(),
  session_id: integer().references(() => sessions.id), 
  option_id: integer().references(() => options.id).notNull(),
  count: integer().notNull().default(0),
  recorded_at: timestamp(),
});