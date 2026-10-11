import { relations } from "drizzle-orm";
import { groups, groupMembers } from "./groups";
import { directMessages, groupChatMessages } from "./messages";
import { roles } from "./roles";
import { refreshTokens } from "./tokens";
import { users } from "./users";

export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  roleRelation: one(roles, {
    fields: [users.role],
    references: [roles.role],
  }),
  sentDirectMessages: many(directMessages, {
    relationName: "sentDirectMessages",
  }),
  receivedDirectMessages: many(directMessages, {
    relationName: "receivedDirectMessages",
  }),
  createdGroups: many(groups),
  groupMemberships: many(groupMembers),
  refreshTokens: many(refreshTokens),
}));

export const directMessagesRelations = relations(directMessages, ({ one }) => ({
  sender: one(users, {
    fields: [directMessages.senderEmail],
    references: [users.email],
    relationName: "sentDirectMessages",
  }),
  receiver: one(users, {
    fields: [directMessages.receiverEmail],
    references: [users.email],
    relationName: "receivedDirectMessages",
  }),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  creator: one(users, {
    fields: [groups.creatorEmail],
    references: [users.email],
  }),
  members: many(groupMembers),
  messages: many(groupChatMessages),
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, {
    fields: [groupMembers.groupId],
    references: [groups.groupId],
  }),
  user: one(users, {
    fields: [groupMembers.userEmail],
    references: [users.email],
  }),
}));

export const groupChatMessagesRelations = relations(
  groupChatMessages,
  ({ one }) => ({
    group: one(groups, {
      fields: [groupChatMessages.groupId],
      references: [groups.groupId],
    }),
    sender: one(users, {
      fields: [groupChatMessages.senderEmail],
      references: [users.email],
      relationName: "groupSender",
    }),
  }),
);

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userEmail],
    references: [users.email],
  }),
}));
