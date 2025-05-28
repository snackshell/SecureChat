import { useEffect, useRef } from 'react';
import { MessageInput } from './MessageInput';
import { Message } from './Message';
import { Settings, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { GroupMessage } from '@shared/schema';

interface MessageAreaProps {
  messages: GroupMessage[];
  currentUser: { username: string; isAdmin: boolean };
  typingUsers: Set<string>;
  onSendMessage: (content: string, imageUrl?: string) => void;
  onSendTyping: (isTyping: boolean) => void;
  onUploadImage: (file: File) => Promise<string>;
}

export function MessageArea({ 
  messages, 
  currentUser, 
  typingUsers, 
  onSendMessage, 
  onSendTyping,
  onUploadImage 
}: MessageAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const typingArray = Array.from(typingUsers).filter(username => username !== currentUser.username);

  return (
    <div className="flex-1 flex flex-col bg-card">
      {/* Chat header */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">Group Chat</h2>
            <p className="text-sm text-muted-foreground">
              {messages.length} messages
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <Search className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-muted-foreground">Welcome to the group chat!</p>
              <p className="text-sm text-muted-foreground mt-1">Start the conversation by sending a message.</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <Message
                key={message.id}
                message={message}
                currentUser={currentUser}
              />
            ))}
            
            {/* Typing indicator */}
            {typingArray.length > 0 && (
              <div className="flex space-x-3 typing-indicator">
                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce"></div>
                    <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="bg-muted rounded-lg rounded-tl-none p-3 max-w-xs">
                    <p className="text-sm text-muted-foreground">
                      {typingArray.length === 1 
                        ? `${typingArray[0]} is typing...`
                        : `${typingArray.slice(0, -1).join(', ')} and ${typingArray[typingArray.length - 1]} are typing...`
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <MessageInput 
        onSendMessage={onSendMessage}
        onSendTyping={onSendTyping}
        onUploadImage={onUploadImage}
      />
    </div>
  );
}
