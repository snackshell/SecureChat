import { useState, useRef, useEffect } from 'react';
import { X, Send, Image as ImageIcon, Loader2, Download, XCircle, Edit2, Check, X as CancelIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useTheme } from '@/contexts/ThemeContext';
import type { DirectMessage, User } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';

interface DirectMessagePanelProps {
  currentUser: User;
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
  const { theme } = useTheme();
  const { token } = useAuth();
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  const getAuthHeaders = (): Record<string, string> | undefined => {
    return token ? { 'Authorization': `Bearer ${token}` } : undefined;
  };

  const handleEditClick = (msg: DirectMessage) => {
    if (msg.id && msg.content) {
      setEditingMessageId(msg.id);
      setEditingContent(msg.content);
    } else {
      console.warn("Cannot edit DM without ID or content");
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent('');
  };

  const handleSaveEdit = async () => {
    if (!editingMessageId || !editingContent.trim()) return;
    try {
      await apiRequest(
        'PUT',
        `/api/messages/direct/${editingMessageId}`,
        { content: editingContent.trim() },
        getAuthHeaders()
      );
      handleCancelEdit(); // Close edit mode
    } catch (error) {
      console.error('Failed to save edited DM:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && !imagePreview) return;
    try {
      if (!imagePreview) {
        await onSendMessage(message.trim(), undefined);
        setMessage('');
        scrollToBottom();
      } else {
        // If imagePreview is set, the button type changes and calls handleSendWithImage
        // This part of handleSubmit might not even be reached if button type is "button"
        // For safety, one could call handleSendWithImage here or ensure it is called by button click
      }
    } catch (error) {
      console.error("Failed to send direct message:", error);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    
    // Actual upload logic will be in handleSendWithImage
    // if (e.target) e.target.value = ''; // Clear file input for next selection
  };

  const handleSendWithImage = async () => {
    if (!imagePreview) return;

    setIsUploading(true);
    try {
      const fetchRes = await fetch(imagePreview!);
      const blob = await fetchRes.blob();
      const file = new File([blob], "upload.png", { type: blob.type }); // Consider dynamic naming/typing

      const imageUrl = await onUploadImage(file);
      await onSendMessage(message.trim(), imageUrl);
      
      setMessage('');
      setImagePreview(null);
      // Clear the file input
      const fileInput = document.getElementById('dm-image-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      scrollToBottom();
    } catch (error) {
      console.error('Failed to upload and send image for DM:', error);
    } finally {
      setIsUploading(false);
    }
  };
  
  const cancelImagePreview = () => {
    setImagePreview(null);
    const fileInput = document.getElementById('dm-image-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const getInitials = (username: string) => {
    return username?.substring(0, 1).toUpperCase() || '?';
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
    <div className="w-full md:w-96 flex flex-col border-l border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* DM Panel Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 z-10">
        <div className="flex items-center space-x-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-semibold">
              {getInitials(otherUser)}
            </AvatarFallback>
          </Avatar>
          <h2 className="text-md font-semibold text-gray-900 dark:text-gray-100">{otherUser}</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded-full">
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-500 dark:text-gray-400">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div key={msg.id || index} className={`flex mb-2 ${msg.fromUser === currentUser.username ? 'justify-end' : 'justify-start'}`}>
              {msg.fromUser !== currentUser.username && (
                <Avatar className="h-6 w-6 mr-2 self-end">
                  <AvatarFallback className="bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs">
                    {getInitials(msg.fromUser)}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className={`group relative max-w-[75%] rounded-lg px-3 py-2 shadow ${msg.fromUser === currentUser.username ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none'}`}>
                {msg.fromUser !== currentUser.username && (
                  <div className="text-xs font-semibold mb-0.5 text-blue-700 dark:text-blue-400">{msg.fromUser}</div>
                )}

                {editingMessageId === msg.id ? (
                  <div className="py-1">
                    <Textarea 
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      className="w-full p-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 resize-none text-gray-900 dark:text-gray-100"
                      rows={3}
                    />
                    <div className="flex justify-end space-x-2 mt-2">
                      <Button variant="ghost" size="sm" onClick={handleCancelEdit} className="text-xs px-2 py-1 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700">
                        <CancelIcon className="h-4 w-4 mr-1" /> Cancel
                      </Button>
                      <Button size="sm" onClick={handleSaveEdit} className="text-xs px-2 py-1 bg-green-600 hover:bg-green-700 text-white">
                        <Check className="h-4 w-4 mr-1" /> Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {msg.content && <p className="text-sm break-words">{msg.content}</p>}
                    {msg.imageUrl && (
                      <div className="relative mt-1.5">
                        <img src={msg.imageUrl} alt="Shared in DM" className="mt-1.5 rounded-md max-w-full h-auto max-h-60 object-contain cursor-pointer" onClick={() => {
                          if (msg.imageUrl) {
                            window.open(msg.imageUrl, '_blank', 'noopener,noreferrer');
                          }
                        }} />
                        <a 
                          href={msg.imageUrl} 
                          download 
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute top-2 right-2 bg-gray-800 bg-opacity-50 hover:bg-opacity-75 text-white p-1.5 rounded-full cursor-pointer"
                          title="Download image"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </div>
                    )}
                  </>
                )}

                <div className={`flex items-center justify-end text-xs mt-1 ${msg.fromUser === currentUser.username ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'}`}>
                  {msg.isEdited && <span className="text-xs italic mr-1">(edited)</span>}
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                
                {msg.fromUser === currentUser.username && !editingMessageId && !msg.imageUrl && (
                  <Button 
                    variant="ghost"
                    size="icon"
                    className="absolute top-0.5 right-0.5 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-gray-400 hover:text-gray-200"
                    onClick={() => handleEditClick(msg)}
                    title="Edit message"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Form */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-950 sticky bottom-0">
        {imagePreview && (
          <div className="relative mb-2 p-2 border border-gray-300 dark:border-gray-600 rounded-md">
            <img src={imagePreview} alt="Preview" className="max-h-40 rounded-md object-contain" />
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-1 right-1 h-6 w-6 rounded-full bg-gray-500 bg-opacity-50 hover:bg-opacity-75 text-white"
              onClick={cancelImagePreview}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div className="flex items-center space-x-2">
          <Input
            type="text"
            placeholder={`Message ${otherUser}...`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-full px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            disabled={isUploading}
          />
          <label htmlFor="dm-image-upload" className="cursor-pointer p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
            <input
              type="file"
              id="dm-image-upload"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              disabled={isUploading || !!imagePreview}
            />
            {isUploading ? (
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
            ) : (
              <ImageIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            )}
          </label>
          <Button 
            type={imagePreview ? "button" : "submit"}
            onClick={imagePreview ? handleSendWithImage : undefined}
            size="icon" 
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-10 h-10 flex-shrink-0"
            disabled={(!message.trim() && !imagePreview) || isUploading}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </form>
    </div>
  );
}
