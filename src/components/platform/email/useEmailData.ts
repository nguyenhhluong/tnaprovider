import { useState, useEffect, useCallback } from "react";
import type { EmailFolder, EmailMessage } from "../../../types/email";
import {
  getMockEmails,
  addMockEmail,
  removeMockEmail,
  updateMockEmail,
  markEmailRead,
  moveEmail,
  deleteEmail,
} from "../../../utils/emailApi";

const MOCK_MODE = import.meta.env.VITE_EMAIL_MOCK_MODE !== "false";

export function useEmailData(folder: EmailFolder) {
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    if (MOCK_MODE) {
      setTimeout(() => {
        if (!cancelled) {
          setMessages(getMockEmails(folder));
          setLoading(false);
        }
      }, 300);
    } else {
      fetch(`/api/email/messages?folder=${folder}`, { credentials: "include" })
        .then((res) => {
          if (!res.ok) throw new Error(`Failed to load ${folder}`);
          return res.json();
        })
        .then((data) => {
          if (!cancelled) {
            setMessages(data);
            setLoading(false);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setError(err.message);
            setLoading(false);
          }
        });
    }

    return () => { cancelled = true; };
  }, [folder]);

  const markRead = useCallback((id: string, isRead: boolean) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, isRead } : m)));
    if (MOCK_MODE) {
      updateMockEmail(id, { isRead });
    } else {
      markEmailRead(id, isRead).catch(() => {
        setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, isRead: !isRead } : m)));
      });
    }
  }, []);

  const moveMessage = useCallback(async (id: string, targetFolder: EmailFolder) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    if (MOCK_MODE) {
      removeMockEmail(id);
    } else {
      try {
        await moveEmail(id, targetFolder);
      } catch (err) {
        // Revert the optimistic removal by re-fetching
        setMessages((prev) => [...prev]);
        throw err;
      }
    }
  }, []);

  const deleteMsg = useCallback(async (id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    if (MOCK_MODE) {
      removeMockEmail(id);
    } else {
      try {
        await deleteEmail(id);
      } catch (err) {
        setMessages((prev) => [...prev]);
        throw err;
      }
    }
  }, []);

  const addSentMessage = useCallback((msg: EmailMessage) => {
    setMessages((prev) => [msg, ...prev]);
    if (MOCK_MODE) {
      addMockEmail("sent", msg);
    }
  }, []);

  return { messages, loading, error, markRead, moveMessage, deleteMsg, addSentMessage };
}
