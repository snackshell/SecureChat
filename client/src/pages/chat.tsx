import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { UserSidebar } from '@/components/chat/UserSidebar';
import { MessageArea } from '@/components/chat/MessageArea';
import { DirectMessagePanel } from '@/components/chat/DirectMessagePanel';
import { apiRequest } from '@/lib/queryClient';
import type { GroupMessage, DirectMessage, User } from '@shared/schema';

export default function Chat() {
  const { user, token, logout } = useAuth();
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [directMessages, setDirectMessages] = useState<Record<string, DirectMessage[]>>({});
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [activeDMUser, setActiveDMUser] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'new_group_message':
        setGroupMessages(prev => [...prev, message.message]);
        break;
      
      case 'new_direct_message':
        const dm = message.message;
        const otherUser = dm.fromUser === user?.username ? dm.toUser : dm.fromUser;
        setDirectMessages(prev => ({
          ...prev,
          [otherUser]: [...(prev[otherUser] || []), dm],
        }));
        break;
      
      case 'user_online':
        loadOnlineUsers();
        break;
      
      case 'user_offline':
        loadOnlineUsers();
        break;
      
      case 'user_typing':
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          if (message.isTyping) {
            newSet.add(message.username);
          } else {
            newSet.delete(message.username);
          }
          return newSet;
        });
        
        // Clear typing status after 3 seconds
        setTimeout(() => {
          setTypingUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(message.username);
            return newSet;
          });
        }, 3000);
        break;
    }
  };

  const { isConnected, sendTypingStatus } = useWebSocket({
    token,
    onMessage: handleWebSocketMessage,
  });

  const loadGroupMessages = async () => {
    try {
      const response = await apiRequest('GET', '/api/messages/group', undefined, {
        'Authorization': `Bearer ${token}`,
      });
      const messages = await response.json();
      setGroupMessages(messages);
    } catch (error) {
      console.error('Failed to load group messages:', error);
    }
  };

  const loadDirectMessages = async (otherUser: string) => {
    try {
      const response = await apiRequest('GET', `/api/messages/direct/${otherUser}`, undefined, {
        'Authorization': `Bearer ${token}`,
      });
      const messages = await response.json();
      setDirectMessages(prev => ({
        ...prev,
        [otherUser]: messages,
      }));
    } catch (error) {
      console.error('Failed to load direct messages:', error);
    }
  };

  const loadOnlineUsers = async () => {
    try {
      const response = await apiRequest('GET', '/api/users/online', undefined, {
        'Authorization': `Bearer ${token}`,
      });
      const users = await response.json();
      setOnlineUsers(users);
    } catch (error) {
      console.error('Failed to load online users:', error);
    }
  };

  const sendGroupMessage = async (content: string, imageUrl?: string) => {
    try {
      await apiRequest('POST', '/api/messages/group', {
        content,
        imageUrl,
      }, {
        'Authorization': `Bearer ${token}`,
      });
    } catch (error) {
      console.error('Failed to send group message:', error);
    }
  };

  const sendDirectMessage = async (toUser: string, content: string, imageUrl?: string) => {
    try {
      await apiRequest('POST', '/api/messages/direct', {
        toUser,
        content,
        imageUrl,
      }, {
        'Authorization': `Bearer ${token}`,
      });
    } catch (error) {
      console.error('Failed to send direct message:', error);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await apiRequest('POST', '/api/upload', formData, {
      'Authorization': `Bearer ${token}`,
    });
    const data = await response.json();
    return data.imageUrl;
  };

  const openDirectMessage = (username: string) => {
    if (username !== user?.username) {
      setActiveDMUser(username);
      if (!directMessages[username]) {
        loadDirectMessages(username);
      }
    }
  };

  const closeDirectMessage = () => {
    setActiveDMUser(null);
  };

  useEffect(() => {
    loadGroupMessages();
    loadOnlineUsers();
  }, []);

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen flex bg-background">
      <UserSidebar
        currentUser={user}
        onlineUsers={onlineUsers}
        onUserClick={openDirectMessage}
        onLogout={logout}
        isConnected={isConnected}
      />
      
      <MessageArea
        messages={groupMessages}
        currentUser={user}
        typingUsers={typingUsers}
        onSendMessage={sendGroupMessage}
        onSendTyping={sendTypingStatus}
        onUploadImage={uploadImage}
      />

      {activeDMUser && (
        <DirectMessagePanel
          currentUser={user}
          otherUser={activeDMUser}
          messages={directMessages[activeDMUser] || []}
          onSendMessage={(content, imageUrl) => sendDirectMessage(activeDMUser, content, imageUrl)}
          onClose={closeDirectMessage}
          onUploadImage={uploadImage}
        />
      )}
    </div>
  );
}
