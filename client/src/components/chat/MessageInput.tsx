import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, Image as ImageIcon, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MessageInputProps {
  onSendMessage: (content: string, imageUrl?: string) => void;
  onSendTyping: (isTyping: boolean) => void;
  onUploadImage: (file: File) => Promise<string>;
}

export function MessageInput({ onSendMessage, onSendTyping, onUploadImage }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<{ url: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();

  const handleSend = async () => {
    if (!message.trim() && !uploadedImage) return;

    try {
      await onSendMessage(message.trim(), uploadedImage?.url);
      setMessage('');
      setUploadedImage(null);
      onSendTyping(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else {
      // Send typing indicator
      onSendTyping(true);
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Stop typing indicator after 1 second of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        onSendTyping(false);
      }, 1000);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    try {
      const imageUrl = await onUploadImage(file);
      setUploadedImage({ url: imageUrl, name: file.name });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeUploadedImage = () => {
    setUploadedImage(null);
  };

  return (
    <div className="p-4 border-t border-border bg-card">
      {/* Image preview */}
      {uploadedImage && (
        <div className="mb-3 p-3 bg-muted rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img 
              src={uploadedImage.url} 
              alt="Upload preview" 
              className="w-12 h-12 rounded object-cover"
            />
            <div>
              <p className="font-medium text-card-foreground">{uploadedImage.name}</p>
              <p className="text-sm text-muted-foreground">Image ready to send</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={removeUploadedImage}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      <div className="flex items-end space-x-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="text-muted-foreground hover:text-foreground"
        >
          <Paperclip className="w-4 h-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="text-muted-foreground hover:text-foreground"
        >
          <ImageIcon className="w-4 h-4" />
        </Button>
        
        <div className="flex-1">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="resize-none min-h-[40px] max-h-32"
          />
        </div>
        
        <Button 
          onClick={handleSend}
          disabled={(!message.trim() && !uploadedImage) || isUploading}
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
  );
}
