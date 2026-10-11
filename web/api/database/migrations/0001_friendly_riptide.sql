ALTER TABLE "group_chat_messages" DROP CONSTRAINT "group_chat_messages_receiver_email_users_email_fk";
--> statement-breakpoint
DROP INDEX "idx_group_chat_messages_receiver";--> statement-breakpoint
ALTER TABLE "group_chat_messages" DROP COLUMN "receiver_email";