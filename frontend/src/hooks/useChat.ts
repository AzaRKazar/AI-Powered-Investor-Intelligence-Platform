import { useCallback, useState } from 'react';
import { sendChatMessage } from '../api/client';
import type { ChatMessageData } from '../components/ChatPanel/ChatMessage';
import type { MetricRow } from '../api/types';

let messageCounter = 0;
const nextId = () => `msg-${++messageCounter}`;

export function useChat(metrics: MetricRow[]) {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = useCallback(
    async (question: string, selectedCompany: string) => {
      const trimmed = question.trim();
      if (!trimmed) return;

      setMessages((prev) => [...prev, { id: nextId(), role: 'user', text: trimmed }]);
      setIsTyping(true);

      try {
        const payload: { question: string; company?: string; year?: number } = {
          question: trimmed,
        };

        if (selectedCompany) {
          payload.company = selectedCompany;
          const selectedRow = metrics.find((row) => row.company === selectedCompany);
          const year = selectedRow ? Number(selectedRow.year) : NaN;
          if (!isNaN(year)) {
            payload.year = year;
          }
        }

        const data = await sendChatMessage(payload);
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: 'bot', text: data.answer || 'No response received.' },
        ]);
      } catch (err) {
        // fetch itself throws a TypeError on network failure, distinct from
        // the plain Error sendChatMessage throws for a non-OK response -
        // matches the old app's distinction between a connection error and
        // a server-side error.
        const isNetworkFailure = err instanceof TypeError;
        const message = err instanceof Error ? err.message : String(err);
        const text = isNetworkFailure
          ? `Connection error: ${message}. Please make sure the server is running.`
          : `Sorry, I encountered an error: ${message}`;
        setMessages((prev) => [...prev, { id: nextId(), role: 'bot', text }]);
      } finally {
        setIsTyping(false);
      }
    },
    [metrics]
  );

  return { messages, isTyping, sendMessage };
}
