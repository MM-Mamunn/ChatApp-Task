CREATE TABLE "activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_email" varchar(255) NOT NULL,
	"action" varchar(64) NOT NULL,
	"target_type" varchar(64),
	"target_id" varchar(255),
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_members" (
	"group_id" uuid NOT NULL,
	"user_email" varchar(255) NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_members_group_id_user_email_pk" PRIMARY KEY("group_id","user_email")
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"group_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(128) NOT NULL,
	"creator_email" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "direct_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_email" varchar(255) NOT NULL,
	"receiver_email" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_chat_messages" (
	"group_id" uuid NOT NULL,
	"sender_email" varchar(255) NOT NULL,
	"receiver_email" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"role" varchar(32) PRIMARY KEY NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_email" varchar(255) NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"is_revoked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"email" varchar(255) PRIMARY KEY NOT NULL,
	"password_hash" varchar(255),
	"name" varchar(128) NOT NULL,
	"avatar_url" text,
	"role" varchar(32) DEFAULT 'user' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_groups_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("group_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_email_users_email_fk" FOREIGN KEY ("user_email") REFERENCES "public"."users"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_creator_email_users_email_fk" FOREIGN KEY ("creator_email") REFERENCES "public"."users"("email") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_sender_email_users_email_fk" FOREIGN KEY ("sender_email") REFERENCES "public"."users"("email") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_receiver_email_users_email_fk" FOREIGN KEY ("receiver_email") REFERENCES "public"."users"("email") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_chat_messages" ADD CONSTRAINT "group_chat_messages_group_id_groups_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("group_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_chat_messages" ADD CONSTRAINT "group_chat_messages_sender_email_users_email_fk" FOREIGN KEY ("sender_email") REFERENCES "public"."users"("email") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_chat_messages" ADD CONSTRAINT "group_chat_messages_receiver_email_users_email_fk" FOREIGN KEY ("receiver_email") REFERENCES "public"."users"("email") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_email_users_email_fk" FOREIGN KEY ("user_email") REFERENCES "public"."users"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_roles_role_fk" FOREIGN KEY ("role") REFERENCES "public"."roles"("role") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_activity_logs_actor" ON "activity_logs" USING btree ("actor_email");--> statement-breakpoint
CREATE INDEX "idx_activity_logs_created_action" ON "activity_logs" USING btree ("created_at","action");--> statement-breakpoint
CREATE INDEX "idx_group_members_user" ON "group_members" USING btree ("user_email");--> statement-breakpoint
CREATE INDEX "idx_groups_creator" ON "groups" USING btree ("creator_email");--> statement-breakpoint
CREATE INDEX "idx_direct_messages_pair" ON "direct_messages" USING btree ("sender_email","receiver_email","created_at");--> statement-breakpoint
CREATE INDEX "idx_direct_messages_receiver" ON "direct_messages" USING btree ("receiver_email","created_at");--> statement-breakpoint
CREATE INDEX "idx_group_chat_messages_group_created" ON "group_chat_messages" USING btree ("group_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_group_chat_messages_sender" ON "group_chat_messages" USING btree ("sender_email");--> statement-breakpoint
CREATE INDEX "idx_group_chat_messages_receiver" ON "group_chat_messages" USING btree ("receiver_email");--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_user" ON "refresh_tokens" USING btree ("user_email","is_revoked");--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_hash" ON "refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "idx_users_role" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_users_is_active" ON "users" USING btree ("is_active");