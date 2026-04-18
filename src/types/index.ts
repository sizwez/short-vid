export interface User {
  id: string;
  name: string;
  username: string;
  email?: string;
  avatar: string;
  bio: string;
  followers: number;
  following: number;
  isCreator: boolean;
  isAdmin: boolean;
  subscription: 'free' | 'premium' | 'creator-boost';
  earnings: number;
  language: string;
  notificationsEnabled?: boolean;
  dataSavingMode?: boolean;
  isPrivateAccount?: boolean;
  allowCommentsOnVideos?: boolean;
}

export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'tip' | 'system';
  message: string;
  timestamp: Date;
  read: boolean;
  userId?: string;
}

export interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  language: string;
  setLanguage: (language: string) => void;
  isAuthenticated: boolean;
  dataSavingMode: boolean;
  setDataSavingMode: (mode: boolean) => void;
  notifications: Notification[];
  setNotifications: (notifications: Notification[]) => void;
}