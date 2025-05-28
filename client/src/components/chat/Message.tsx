import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Crown } from 'lucide-react';
import type { GroupMessage } from '@shared/schema';

interface MessageProps {
  message: GroupMessage;
  currentUser: { username: string; isAdmin: boolean };
  isDirectMessage?: boolean;
}

export function Message({ message, currentUser, isDirectMessage = false }: MessageProps) {
  const isOwnMessage = message.sender === currentUser.username;
  const isAdminMessage = message.sender === 'adu'; // Simple admin check
  
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

  const formatTime = (timestamp: Date | string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isDirectMessage) {
    // Simplified layout for direct messages
    if (isOwnMessage) {
      return (
        <div className="flex space-x-2 justify-end">
          <div className="flex-1 flex flex-col items-end">
            <div className="bg-primary text-primary-foreground rounded-lg rounded-tr-none p-2 max-w-xs">
              {message.content && <p className="text-sm">{message.content}</p>}
              {message.imageUrl && (
                <img 
                  src={message.imageUrl} 
                  alt="Shared image" 
                  className="rounded max-w-xs mt-2 cursor-pointer hover:opacity-90"
                />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{formatTime(message.timestamp)}</p>
          </div>
          <Avatar className={`w-6 h-6 ${getUserColor(message.sender, currentUser.isAdmin)} flex-shrink-0`}>
            <AvatarFallback className="text-white text-xs font-semibold">
              {getInitials(message.sender)}
            </AvatarFallback>
          </Avatar>
        </div>
      );
    } else {
      return (
        <div className="flex space-x-2">
          <Avatar className={`w-6 h-6 ${getUserColor(message.sender, isAdminMessage)} flex-shrink-0`}>
            <AvatarFallback className="text-white text-xs font-semibold">
              {getInitials(message.sender)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg rounded-tl-none p-2 max-w-xs">
              {message.content && <p className="text-sm text-card-foreground">{message.content}</p>}
              {message.imageUrl && (
                <img 
                  src={message.imageUrl} 
                  alt="Shared image" 
                  className="rounded max-w-xs mt-2 cursor-pointer hover:opacity-90"
                />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{formatTime(message.timestamp)}</p>
          </div>
        </div>
      );
    }
  }

  // Group message layout
  if (isOwnMessage) {
    return (
      <div className="flex space-x-3 justify-end">
        <div className="flex-1 min-w-0 flex flex-col items-end">
          <div className="flex items-center space-x-2 mb-1 flex-row-reverse">
            <span className="font-semibold text-card-foreground">{message.sender}</span>
            <span className="text-xs text-muted-foreground">{formatTime(message.timestamp)}</span>
            {currentUser.isAdmin && (
              <Badge variant="destructive" className="text-xs">
                <Crown className="w-3 h-3 mr-1" />
                Admin
              </Badge>
            )}
          </div>
          <div className="bg-primary text-primary-foreground rounded-lg rounded-tr-none p-3 max-w-xs message-enter">
            {message.content && <p>{message.content}</p>}
            {message.imageUrl && (
              <img 
                src={message.imageUrl} 
                alt="Shared image" 
                className="rounded-lg max-w-xs mt-2 cursor-pointer hover:opacity-90"
              />
            )}
          </div>
        </div>
        <Avatar className={`w-10 h-10 ${getUserColor(message.sender, currentUser.isAdmin)} flex-shrink-0`}>
          <AvatarFallback className="text-white font-semibold">
            {getInitials(message.sender)}
          </AvatarFallback>
        </Avatar>
      </div>
    );
  } else {
    return (
      <div className="flex space-x-3 message-enter">
        <div className="relative">
          <Avatar className={`w-10 h-10 ${getUserColor(message.sender, isAdminMessage)} flex-shrink-0`}>
            <AvatarFallback className="text-white font-semibold">
              {getInitials(message.sender)}
            </AvatarFallback>
          </Avatar>
          {isAdminMessage && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center">
              <Crown className="w-2 h-2" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className={`font-semibold ${isAdminMessage ? 'text-red-600' : 'text-card-foreground'}`}>
              {message.sender}
            </span>
            {isAdminMessage && (
              <Badge variant="destructive" className="text-xs">
                <Crown className="w-3 h-3 mr-1" />
                Admin
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">{formatTime(message.timestamp)}</span>
          </div>
          <div className={`${isAdminMessage ? 'bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800' : 'bg-muted'} rounded-lg rounded-tl-none p-3 max-w-lg`}>
            {message.content && <p className="text-card-foreground">{message.content}</p>}
            {message.imageUrl && (
              <img 
                src={message.imageUrl} 
                alt="Shared image" 
                className="rounded-lg max-w-xs mt-2 cursor-pointer hover:opacity-90"
              />
            )}
          </div>
        </div>
      </div>
    );
  }
}
