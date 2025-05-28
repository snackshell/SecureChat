import { Users, LogOut, Wifi, WifiOff, Crown, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTheme } from '@/contexts/ThemeContext';
import type { User, ClientUser } from '@shared/schema';

interface UserSidebarProps {
  currentUser: User;
  onlineUsers: ClientUser[];
  onUserClick: (username: string) => void;
  onLogout: () => void;
  isConnected: boolean;
}

export function UserSidebar({ 
  currentUser, 
  onlineUsers, 
  onUserClick, 
  onLogout, 
  isConnected 
}: UserSidebarProps) {
  const { theme, toggleTheme } = useTheme();

  const getInitials = (username: string) => {
    return username?.substring(0, 2).toUpperCase() || '??';
  };

  return (
    <div className="w-64 h-full flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shrink-0">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
            SC
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">SecureChat</h2>
        </div>
        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded-full">
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={onLogout} className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded-full">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3 mb-2">
          <Avatar className="h-10 w-10 border-2 border-blue-500 dark:border-blue-400">
            <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold">
              {getInitials(currentUser.username)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-grow overflow-hidden">
            <span className="font-semibold text-gray-900 dark:text-gray-100 truncate block">{currentUser.username}</span>
            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
              {isConnected ? (
                <>
                  <Wifi className="w-3 h-3 text-green-500 mr-1" /> Online
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-red-500 mr-1" /> Offline
                </>
              )}
              {currentUser.isAdmin && <Crown className="h-4 w-4 text-red-500 ml-2" />}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Online Users ({onlineUsers.length})</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pt-0 space-y-2">
        {onlineUsers.map(user => (
          <div
            key={user.id}
            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-150"
            onClick={() => onUserClick(user.username)}
            title={`Chat with ${user.username}`}
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className={`bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-semibold`}>
                {getInitials(user.username)}
              </AvatarFallback>
            </Avatar>
            <span className="flex-grow font-medium text-sm text-gray-800 dark:text-gray-200 truncate">{user.username}</span>
            {user.isAdmin && <Crown className="h-4 w-4 text-red-500 shrink-0" />}
            <div className="w-2 h-2 bg-green-500 rounded-full shrink-0" title="Online"></div>
          </div>
        ))}
        {onlineUsers.length === 0 && (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">No other users online.</p>
        )}
      </div>
    </div>
  );
}
