import { useEffect, useRef } from 'react';
import { ChatMessage, type ChatMessageData } from './ChatMessage';
import { TypingIndicator } from './TypingIndicator';

interface ChatMessageListProps {
  messages: ChatMessageData[];
  isTyping: boolean;
}

const WELCOME_MESSAGE: ChatMessageData = {
  id: 'welcome',
  role: 'bot',
  text: "Hello! I'm your AI Financial Analyst. Ask me anything about the ingested company reports — revenue trends, risk analysis, growth drivers, and more.",
};

export function ChatMessageList({ messages, isTyping }: ChatMessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages, isTyping]);

  return (
    <div className="chat-messages" ref={containerRef}>
      <ChatMessage message={WELCOME_MESSAGE} />
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
      {isTyping && <TypingIndicator />}
    </div>
  );
}
