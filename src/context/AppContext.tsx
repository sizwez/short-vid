import React, { createContext, useContext, useState, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  followers: number;
  following: number;
  isCreator: boolean;
  subscription: 'free' | 'premium' | 'creator-boost';
  earnings: number;
  language: string;
}

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  language: string;
  setLanguage: (language: string) => void;
  isAuthenticated: boolean;
  dataSavingMode: boolean;
  setDataSavingMode: (mode: boolean) => void;
  notifications: any[];
  setNotifications: (notifications: any[]) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [language, setLanguage] = useState('en');
  const [dataSavingMode, setDataSavingMode] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const isAuthenticated = user !== null;

  return (
    <AppContext.Provider 
      value={{
        user,
        setUser,
        language,
        setLanguage,
        isAuthenticated,
        dataSavingMode,
        setDataSavingMode,
        notifications,
        setNotifications
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
