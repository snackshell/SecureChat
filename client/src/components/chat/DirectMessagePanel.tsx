import { useState, useRef, useEffect } from 'react';
import { X, Send, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Message } from './Message';
import type { DirectMessage } from '@shared/schema';

interface DirectMessagePanelProps {
  currentUser: { username: string; isAdmin: boolean };
  otherUser: string;
  messages: DirectMessage[];
  onSendMessage: (content: string, imageUrl?: string) => void;
  onClose: () => void;
  onUploadImage: (file: File) => Promise<string>;
}

export function DirectMessagePanel({ 
  currentUser, 
  otherUser, 
  messages, 
  onSendMessage, 
  onClose,
  onUploadImage 
}: DirectMessagePanelProps) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim()) return;
    
    await onSendMessage(message.trim());
    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imageUrl = await onUploadImage(file);
      await onSendMessage('', imageUrl);
    } catch (error) {
      console.error('Failed to upload and send image:', error);
    }
  };

  const getInitials = (username: string) => {
    return username.substring(0, 2).toUpperCase();
  };

  const getUserColor = (username: string) => {
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

  // Convert DirectMessage to GroupMessage format for Message component
  const convertedMessages = messages.map((dm) => ({
    id: dm.id,
    sender: dm.fromUser,
    content: dm.content,
    imageUrl: dm.imageUrl,
    timestamp: dm.timestamp,
  }));

  return (
    <div className="w-80 bg-card border-l border-border flex flex-col">
      {/* DM header */}
      <div className="p-4 border-b border-border bg-muted/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className={`w-8 h-8 ${getUserColor(otherUser)}`}>
              <AvatarFallback className="text-white text-sm font-semibold">
                {getInitials(otherUser)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-card-foreground">{otherUser}</h3>
              <p className="text-xs text-muted-foreground">Direct Message</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* DM messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {convertedMessages.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm">
            Start a conversation with {otherUser}
          </div>
        ) : (
          convertedMessages.map((message) => (
            <Message
              key={message.id}
              message={message}
              currentUser={currentUser}
              isDirectMessage={true}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* DM input area */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="text-muted-foreground hover:text-foreground"
          >
            <ImageIcon className="w-4 h-4" />
          </Button>
          
          <Input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${otherUser}...`}
            className="flex-1 text-sm"
          />
          
          <Button
            onClick={handleSend}
            disabled={!message.trim()}
            size="sm"
            className="bg-primary hover:bg-primary/90"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
}
