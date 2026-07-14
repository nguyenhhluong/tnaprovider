import { useState, useEffect, useCallback } from "react";
import type { EmailFolder, EmailMessage } from "../../../types/email";
import {
  markEmailRead,
  moveEmail,
  deleteEmail,
  listMessages,
} from "../../../utils/emailApi";

export function useEmailData(folder: EmailFolder) {
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listMessages(folder);
      setMessages(data);
    } catch (err: any) {
      setError(err.message || `Failed to load ${folder}`);
    } finally {
      setLoading(false);
    }
  }, [folder]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const markRead = useCallback((id: string, isRead: boolean) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, isRead } : m)));
    markEmailRead(id, isRead).catch(() => {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, isRead: !isRead } : m)));
    });
  }, []);

  const moveMessage = useCallback(async (id: string, targetFolder: EmailFolder) => {
    let previousMessages: EmailMessage[] = [];
    setMessages((prev) => {
      previousMessages = prev;
      return prev.filter((m) => m.id !== id);
    });
    try {
      await moveEmail(id, targetFolder);
    } catch (err) {
      setMessages(previousMessages);
      throw err;
    }
  }, []);

  const deleteMsg = useCallback(async (id: string) => {
    let previousMessages: EmailMessage[] = [];
    setMessages((prev) => {
      previousMessages = prev;
      return prev.filter((m) => m.id !== id);
    });
    try {
      await deleteEmail(id);
    } catch (err) {
      setMessages(previousMessages);
      throw err;
    }
  }, []);

  const addSentMessage = useCallback((msg: EmailMessage) => {
    setMessages((prev) => [msg, ...prev]);
  }, []);

  const refresh = useCallback(() => {
    loadMessages();
  }, [loadMessages]);

  return { messages, loading, error, markRead, moveMessage, deleteMsg, addSentMessage, refresh };
}
