import { Users, LogOut, Wifi, WifiOff, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { User } from '@shared/schema';

interface UserSidebarProps {
  currentUser: { username: string; isAdmin: boolean };
  onlineUsers: User[];
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
  const getInitials = (username: string) => {
    return username.substring(0, 2).toUpperCase();
  };

  const getUserColor = (username: string, isAdmin: boolean) => {
    if (isAdmin) return 'bg-red-500';
    
    const colors = [
      'bg-blue-500',
      'bg-green-500', 
      'bg-purple-500',
      'bg-orange-500',
      'bg-pink-500',
      'bg-indigo-500',
    ];
    
    const index = username.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col">
      {/* Header with current user */}
      <div className="p-4 border-b border-border bg-muted/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className={`${getUserColor(currentUser.username, currentUser.isAdmin)} ${currentUser.isAdmin ? 'admin-glow' : ''}`}>
              <AvatarFallback className="text-white font-semibold">
                {getInitials(currentUser.username)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-card-foreground">
                {currentUser.username}
                {currentUser.isAdmin && (
                  <Crown className="inline w-4 h-4 ml-1 text-red-500" />
                )}
              </h3>
              <div className="flex items-center space-x-1">
                {isConnected ? (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full online-dot"></div>
                    <span className="text-xs text-muted-foreground">Online</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-xs text-muted-foreground">Connecting...</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="text-muted-foreground hover:text-destructive"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Connection status */}
      <div className="px-4 py-2 bg-muted/30">
        <div className="flex items-center space-x-2 text-sm">
          {isConnected ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500" />
          )}
          <span className="text-muted-foreground">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Online users list */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        <div className="flex items-center space-x-2 mb-3">
          <Users className="w-4 h-4 text-muted-foreground" />
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Online Users ({onlineUsers.length})
          </h4>
        </div>
        
        <div className="space-y-2">
          {onlineUsers.map((user) => (
            <div
              key={user.username}
              onClick={() => onUserClick(user.username)}
              className={`flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors ${
                user.isAdmin ? 'ring-1 ring-red-200' : ''
              }`}
            >
              <div className="relative">
                <Avatar className={`w-8 h-8 ${getUserColor(user.username, user.isAdmin)}`}>
                  <AvatarFallback className="text-white text-sm font-semibold">
                    {getInitials(user.username)}
                  </AvatarFallback>
                </Avatar>
                {user.isOnline && (
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-card rounded-full online-dot"></div>
                )}
                {user.isAdmin && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center">
                    <Crown className="w-2 h-2" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium text-card-foreground truncate">
                    {user.username}
                  </p>
                  {user.isAdmin && (
                    <Badge variant="destructive" className="text-xs">
                      Admin
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {user.username === currentUser.username 
                    ? 'You' 
                    : user.isOnline 
                    ? 'Online' 
                    : `Last seen ${new Date(user.lastSeen || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  }
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
