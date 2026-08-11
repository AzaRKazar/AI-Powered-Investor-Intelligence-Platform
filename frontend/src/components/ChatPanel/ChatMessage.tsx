import { renderMarkdown } from '../../utils/markdown';
import { USER_AVATAR_ICON, BOT_AVATAR_ICON } from './chatIcons';

export interface ChatMessageData {
  id: string;
  role: 'user' | 'bot';
  text: string;
}

interface ChatMessageProps {
  message: ChatMessageData;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const { role, text } = message;

  return (
    <div className={`chat-msg ${role}-msg`}>
      <div className={`chat-avatar ${role}-avatar`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d={role === 'user' ? USER_AVATAR_ICON : BOT_AVATAR_ICON} />
        </svg>
      </div>
      {/* Safe: renderMarkdown escapes raw text before generating any markup */}
      <div
        className={`chat-bubble ${role}-bubble`}
        dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
      />
    </div>
  );
}
