import { useState, useEffect, useCallback, useRef } from "react";
import type { EmailFolder, EmailMessage } from "../../../types/email";
import {
  markEmailRead,
  moveEmail,
  deleteEmail,
  listMessages,
  type SearchParams,
  type SearchResult,
} from "../../../utils/emailApi";

export function useEmailData(folder: EmailFolder, initialSearch?: SearchParams) {
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searchParams, setSearchParams] = useState<SearchParams | undefined>(initialSearch);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<any>(null);

  const loadMessages = useCallback(async (params?: SearchParams) => {
    // Cancel previous in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);
    try {
      const sr = await listMessages(folder, params);
      setMessages(sr.items || []);
      setSearchResult(sr);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setError(err.message || `Failed to load ${folder}`);
      }
    } finally {
      setLoading(false);
    }
  }, [folder]);

  useEffect(() => {
    loadMessages(searchParams);
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [loadMessages]);

  const debouncedSearch = useCallback((params: SearchParams) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchParams(params);
    }, 400);
  }, []);

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
    loadMessages(searchParams);
  }, [loadMessages, searchParams]);

  return {
    messages,
    loading,
    error,
    searchResult,
    searchParams,
    markRead,
    moveMessage,
    deleteMsg,
    addSentMessage,
    refresh,
    debouncedSearch,
    setSearchParams,
  };
}
