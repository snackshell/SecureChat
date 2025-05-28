import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { UserSidebar } from '@/components/chat/UserSidebar';
import { MessageArea } from '@/components/chat/MessageArea';
import { DirectMessagePanel } from '@/components/chat/DirectMessagePanel';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useTheme } from '@/contexts/ThemeContext';
import type { GroupMessage, DirectMessage, User, EditMessagePayload, UserOnlinePayload, UserOfflinePayload, ClientUser } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';

export default function Chat() {
  const { user, token, logout } = useAuth();
  const { theme } = useTheme();
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [directMessages, setDirectMessages] = useState<Record<string, DirectMessage[]>>({});
  const [allChatMembers, setAllChatMembers] = useState<ClientUser[]>([]);
  const [activeDMUser, setActiveDMUser] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  const getAuthHeaders = (): Record<string, string> | undefined => {
    return token ? { 'Authorization': `Bearer ${token}` } : undefined;
  };

  const handleWebSocketMessage = (wsMessage: any) => {
    switch (wsMessage.type) {
      case 'new_group_message':
        setGroupMessages(prev => [...prev, wsMessage.message]);
        break;
      
      case 'new_direct_message':
        const dm = wsMessage.message as DirectMessage;
        const otherUserInDM = dm.fromUser === user?.username ? dm.toUser : dm.fromUser;
        setDirectMessages(prev => ({
          ...prev,
          [otherUserInDM]: [...(prev[otherUserInDM] || []), dm],
        }));
        if (activeDMUser === otherUserInDM) {
          // This might trigger a re-render or you might have a more direct way
        }
        break;

      case 'edit_group_message':
        const editedGroupMessage = wsMessage.message as GroupMessage;
        setGroupMessages(prev => 
          prev.map(msg => msg.id === editedGroupMessage.id ? editedGroupMessage : msg)
        );
        break;

      case 'edit_direct_message':
        const editedDm = wsMessage.message as DirectMessage;
        const otherUserInEditedDM = editedDm.fromUser === user?.username ? editedDm.toUser : editedDm.fromUser;
        setDirectMessages(prev => {
          const userDms = prev[otherUserInEditedDM] || [];
          return {
            ...prev,
            [otherUserInEditedDM]: userDms.map(msg => msg.id === editedDm.id ? editedDm : msg),
          };
        });
        break;
      
      case 'user_online':
        const onlinePayload = wsMessage as UserOnlinePayload;
        setAllChatMembers(prevMembers => {
          const existingUser = prevMembers.find(u => u.username === onlinePayload.user.username);
          if (existingUser) {
            return prevMembers.map(u => 
              u.username === onlinePayload.user.username 
                ? { ...u, ...onlinePayload.user, isOnline: true } 
                : u
            );
          }
          // If user wasn't in the initial list (should be rare), add them
          return [...prevMembers, { ...onlinePayload.user, isOnline: true }]; 
        });
        break;
      
      case 'user_offline':
        const offlinePayload = wsMessage as UserOfflinePayload;
        setAllChatMembers(prevMembers => 
          prevMembers.map(u => 
            u.username === offlinePayload.username 
              ? { ...u, isOnline: false, lastSeen: offlinePayload.lastSeen } 
              : u
          )
        );
        break;
      
      case 'user_typing':
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          if (wsMessage.isTyping) {
            newSet.add(wsMessage.username);
          } else {
            newSet.delete(wsMessage.username);
          }
          return newSet;
        });
        
        setTimeout(() => {
          setTypingUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(wsMessage.username);
            return newSet;
          });
        }, 3000);
        break;
    }
  };

  const { isConnected, sendTypingStatus, lastMessage } = useWebSocket({
    token,
    onMessage: handleWebSocketMessage,
  });

  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === 'edit_group_message') {
        const editedGroupMessage = lastMessage.message as GroupMessage;
        setGroupMessages(prev => 
          prev.map(msg => msg.id === editedGroupMessage.id ? editedGroupMessage : msg)
        );
      } else if (lastMessage.type === 'edit_direct_message') {
        const editedDm = lastMessage.message as DirectMessage;
        const otherUserInEditedDM = editedDm.fromUser === user?.username ? editedDm.toUser : editedDm.fromUser;
        setDirectMessages(prev => {
          const userDms = prev[otherUserInEditedDM] || [];
          return {
            ...prev,
            [otherUserInEditedDM]: userDms.map(msg => msg.id === editedDm.id ? editedDm : msg),
          };
        });
      }
    }
  }, [lastMessage, user?.username]);

  const fetchAllChatMembers = useCallback(async () => {
    if (!token) {
      console.log("[fetchAllChatMembers] No token, returning empty array.");
      return [];
    }
    console.log("[fetchAllChatMembers] Token found, attempting to fetch.");
    try {
      const res = await apiRequest('GET', '/api/users/all_members', undefined, getAuthHeaders());
      const data = await res.json() as ClientUser[];
      console.log("[fetchAllChatMembers] Fetched data:", data);
      // setAllChatMembers(data); // Let useQuery handle providing the data directly or via useEffect
      return data;
    } catch (error) {
      console.error('Failed to fetch all chat members:', error);
      return [];
    }
  }, [token, getAuthHeaders]); // Added getAuthHeaders to dependencies of useCallback

  const { data: queryChatMembers, isLoading: isLoadingMembers, error: membersError } = useQuery({
    queryKey: ['allChatMembers', token], // Add token to queryKey to refetch on login
    queryFn: fetchAllChatMembers,
    enabled: !!token, // Only run if token is available
  });

  useEffect(() => {
    if (queryChatMembers) {
      console.log("[Chat.tsx useEffect] queryChatMembers updated, setting allChatMembers:", queryChatMembers);
      setAllChatMembers(queryChatMembers);
    }
  }, [queryChatMembers]); // useEffect to sync useQuery result to allChatMembers state

  useEffect(() => {
    if (membersError) {
        console.error("[Chat.tsx useQuery allChatMembers] Error:", membersError);
    }
  }, [membersError]);

  const fetchGroupMessages = async () => {
    try {
      const res = await apiRequest('GET', '/api/messages/group', undefined, getAuthHeaders());
      const data = await res.json();
      setGroupMessages(data);
    } catch (error) {
      console.error('Failed to fetch group messages:', error);
    }
  };

  const fetchDirectMessages = async (otherUsername: string) => {
    try {
      const res = await apiRequest('GET', `/api/messages/direct/${otherUsername}`, undefined, getAuthHeaders());
      const data = await res.json();
      setDirectMessages(prev => ({ ...prev, [otherUsername]: data }));
    } catch (error) {
      console.error(`Failed to fetch DMs for ${otherUsername}:`, error);
    }
  };

  const loadGroupMessages = async () => {
    try {
      const response = await apiRequest('GET', '/api/messages/group', undefined, getAuthHeaders());
      const messages = await response.json();
      setGroupMessages(messages);
    } catch (error) {
      console.error('Failed to load group messages:', error);
    }
  };

  const loadDirectMessages = async (otherUser: string) => {
    try {
      const response = await apiRequest('GET', `/api/messages/direct/${otherUser}`, undefined, getAuthHeaders());
      const messages = await response.json();
      setDirectMessages(prev => ({
        ...prev,
        [otherUser]: messages,
      }));
    } catch (error) {
      console.error('Failed to load direct messages:', error);
    }
  };

  const sendGroupMessage = async (content: string, imageUrl?: string) => {
    if (!user) return;
    try {
      await apiRequest('POST', '/api/messages/group', { content, imageUrl }, getAuthHeaders());
    } catch (error) {
      console.error('Failed to send group message:', error);
    }
  };

  const sendDirectMessage = async (toUsername: string, content: string, imageUrl?: string) => {
    if (!user) return;
    try {
      await apiRequest('POST', '/api/messages/direct', { toUser: toUsername, content, imageUrl }, getAuthHeaders());
    } catch (error) {
      console.error('Failed to send direct message to', toUsername, error);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await apiRequest('POST', '/api/upload', formData, getAuthHeaders());
      const data = await res.json();
      return data.imageUrl;
    } catch (error) {
      console.error('Failed to upload image:', error);
      throw error;
    }
  };

  const openDirectMessage = (username: string) => {
    if (username !== user?.username) {
      setActiveDMUser(username);
      if (!directMessages[username]) {
        fetchDirectMessages(username);
      }
    }
  };

  const closeDirectMessage = () => {
    setActiveDMUser(null);
  };

  useEffect(() => {
    if (token && user) {
      console.log("[Chat.tsx] Token and user found, loading initial data (group messages).");
      loadGroupMessages();
      // fetchAllChatMembers is handled by useQuery
    } else {
      console.log("[Chat.tsx] No token or user found on mount/update for initial data load.");
    }
  }, [token, user]);

  if (!user || !token) {
    console.log("[Chat.tsx] Critical: No user or token. Not rendering Chat.");
    return null;
  }

  return (
    <div className={`flex h-screen antialiased text-gray-800 dark:text-gray-200 ${theme === 'dark' ? 'dark' : ''}`}>
      <UserSidebar
        currentUser={user as User}
        allUsers={allChatMembers}
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
