/**
 * Message system TypeScript types for SGXP
 * Integrates with Payload CMS backend messaging system
 */

export interface User {
  id: string;
  email: string;
  name?: string;
  username?: string;
  profilePicture?: {
    url: string;
  };
}

export interface Message {
  id: string;
  messageType: 'announcement' | 'moderation' | 'private';
  subject: string;
  content: string;
  sender: User;
  recipient: User;
  parentMessage?: Message;
  isReply: boolean;
  conversationId: string;
  replyCount: number;
  contentReference?: {
    referenceType: string;
    [key: string]: any;
  };
  isRead: boolean;
  readAt?: Date;
  isArchived: boolean;
  priority: 'normal' | 'important' | 'urgent';
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageFilters {
  unreadOnly: boolean;
  messageType: 'all' | 'announcement' | 'moderation' | 'private';
  search: string;
  archived: boolean;
}

export interface UnreadCountResponse {
  unreadCount: number;
  lastChecked: string;
}

export interface MessagesResponse {
  docs: Message[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}
