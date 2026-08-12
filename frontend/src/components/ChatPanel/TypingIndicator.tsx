import { BOT_AVATAR_ICON } from './chatIcons';

export function TypingIndicator() {
  return (
    <div className="chat-msg bot-msg">
      <div className="chat-avatar bot-avatar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d={BOT_AVATAR_ICON} />
        </svg>
      </div>
      <div className="chat-bubble bot-bubble typing-bubble">
        <div className="typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  );
}
