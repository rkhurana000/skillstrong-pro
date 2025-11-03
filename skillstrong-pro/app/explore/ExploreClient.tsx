// /app/explore/ExploreClient.tsx
'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { MessageSquarePlus, Send, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useLocation } from '@/app/contexts/LocationContext';
import './chat.css'; // Import the new stylesheet

// --- Type Definitions ---
type Role = 'user' | 'assistant';
interface Message { role: Role; content: string; }
interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  provider: 'openai' | 'gemini';
  updated_at?: string;
}
type HistoryItem = Omit<Conversation, 'messages' | 'provider'>;

// --- Initial Welcome Prompts ---
const explorePrompts = [
  'Explore CNC Machinist careers',
  'What does a Robotics Technologist do?',
  'Find apprenticeships for Welders',
  'Tell me about salaries for Maintenance Techs',
];

// --- Helper Components ---
const TypingIndicator = () => (
  <div className="flex items-center space-x-2 p-2">
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:0.2s]" />
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:0.4s]" />
  </div>
);

// --- Main Component Wrapper (Server Fetches History) ---
export default function ExplorePageWrapper({ user, history }: { user: User | null; history: HistoryItem[] }) {
  return (
    <Suspense fallback={<div className="flex-1 p-8 text-center">Loading...</div>}>
      <ExploreClient user={user} initialHistory={history} />
    </Suspense>
  );
}

// --- The Main Client Component ---
function ExploreClient({ user, initialHistory }: { user: User | null; initialHistory: HistoryItem[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [history, setHistory] = useState<HistoryItem[]>(initialHistory);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [currentFollowUps, setCurrentFollowUps] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const { location } = useLocation();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const hasLoadedFromUrl = useRef(false);

  const activeConversationId = activeConversation?.id || null;

  // Effect for auto-scrolling
  useEffect(() => {
    if (chatContainerRef.current) {
      setTimeout(() => {
        chatContainerRef.current!.scrollTop = chatContainerRef.current!.scrollHeight;
      }, 100);
    }
  }, [activeConversation?.messages, isLoading]);

  // Effect to load a conversation from URL on initial page load
  useEffect(() => {
    const convoId = searchParams.get('id');
    if (convoId && !hasLoadedFromUrl.current && initialHistory.some(h => h.id === convoId)) {
      hasLoadedFromUrl.current = true;
      handleHistoryClick(convoId, false);
    }
  }, [searchParams, initialHistory]);

  const createNewChat = () => {
    setActiveConversation(null);
    setCurrentFollowUps([]);
    router.push(pathname);
  };

  const handleHistoryClick = async (id: string, navigate = true) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/chat/conversation?id=${id}`);
      if (!res.ok) throw new Error('Failed to fetch conversation');
      const convo: Conversation = await res.json();
      setActiveConversation(convo);
      setCurrentFollowUps([]);
      if (navigate) {
        router.push(`${pathname}?id=${id}`);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const saveConversation = async (convo: Partial<Conversation>): Promise<Conversation> => {
    if (convo.messages?.length === 2) {
      const titleRes = await fetch('/api/title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: convo.messages }),
      });
      const { title } = await titleRes.json();
      convo.title = title || 'New Conversation';
    }

    const res = await fetch('/api/chat/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(convo),
    });
    return await res.json();
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || !user) {
      if (!user) router.push('/account');
      return;
    }

    setIsLoading(true);
    setInputValue('');
    setCurrentFollowUps([]);
    
    const messages: Message[] = activeConversation
      ? [...activeConversation.messages, { role: 'user', content: text }]
      : [{ role: 'user', content: text }];
    
    const tempId = `temp-${Date.now()}`;
    setActiveConversation(prev => ({
      id: prev?.id || tempId,
      title: prev?.title || 'New Conversation',
      messages,
      provider: prev?.provider || 'openai',
    }));
    
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, location }),
      });
      
      if (!res.ok) throw new Error('Failed to get response from AI');
      const data: { answer: string; followups: string[] } = await res.json();
      
      const newMessages: Message[] = [...messages, { role: 'assistant', content: data.answer }];
      
      const savedConvoData = await saveConversation({
        id: activeConversation?.id === tempId ? undefined : activeConversation?.id,
        messages: newMessages,
        provider: activeConversation?.provider || 'openai'
      });
      
      const finalConversation = { ...savedConvoData, messages: newMessages };
      setActiveConversation(finalConversation);

      setHistory(prev => {
        const existingIndex = prev.findIndex(h => h.id === finalConversation.id);
        const newHistoryItem = { id: finalConversation.id, title: finalConversation.title, updated_at: finalConversation.updated_at };

        if (existingIndex > -1) {
          const updatedHistory = [...prev];
          updatedHistory[existingIndex] = newHistoryItem;
          return updatedHistory.sort((a, b) => new Date(b.updated_at!).getTime() - new Date(a.updated_at!).getTime());
        }
        return [newHistoryItem, ...prev];
      });

      if (!searchParams.get('id')) {
        router.push(`${pathname}?id=${finalConversation.id}`);
      }
      
      setCurrentFollowUps(data.followups || []);
    } catch (error) {
      console.error(error);
      const errorMsg: Message = { role: 'assistant', content: "Sorry, an error occurred. Please try again." };
      setActiveConversation(prev => ({ ...prev!, messages: [...messages, errorMsg] }));
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="chat-container">
      <aside className="chat-sidebar">
        <div className="sidebar-header">
          <button onClick={createNewChat} className="new-chat-btn">
            <MessageSquarePlus size={20} style={{ marginRight: '0.5rem' }} />
            New Chat
          </button>
        </div>
        <nav className="history-list">
          {history.map(item => (
            <div
              key={item.id}
              className={`history-item ${item.id === activeConversationId ? 'active' : ''}`}
              onClick={() => handleHistoryClick(item.id)}
              title={item.title}
            >
              {item.title}
            </div>
          ))}
        </nav>
      </aside>

      <main className="chat-main">
        <div ref={chatContainerRef} className="chat-messages">
          {!activeConversation ? (
            <div className="welcome-view">
              <Bot size={48} className="text-blue-600 mb-4" />
              <h2>SkillStrong Coach</h2>
              <p>How can I help you explore manufacturing careers today?</p>
              <div className="explore-grid">
                {explorePrompts.map(prompt => (
                  <button key={prompt} onClick={() => sendMessage(prompt)} className="explore-btn">
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="message-list">
              {activeConversation.messages.map((msg, idx) => (
                <div key={idx} className={`message-wrapper ${msg.role}`}>
                  <div className={`message-bubble ${msg.role}`}>
                    <article className={`prose ${msg.role === 'user' ? 'prose-invert' : ''}`}>
                       <ReactMarkdown remarkPlugins={[remarkGfm as any]} components={{ a: ({ node, ...props }) => <a {...props} target="_blank" rel="noreferrer" /> }}>
                         {msg.content}
                       </ReactMarkdown>
                    </article>
                  </div>
                </div>
              ))}
              {isLoading && (
                 <div className="message-wrapper assistant">
                   <div className="message-bubble assistant">
                      <TypingIndicator />
                   </div>
                 </div>
              )}
            </div>
          )}
        </div>
        
        <footer className="chat-footer">
            <div className="footer-content">
                {currentFollowUps.length > 0 && !isLoading && (
                    <div className="follow-ups">
                        {currentFollowUps.map((prompt, i) => (
                            <button key={i} onClick={() => sendMessage(prompt)} className="follow-up-btn">
                                {prompt}
                            </button>
                        ))}
                    </div>
                )}
                <form onSubmit={(e) => { e.preventDefault(); sendMessage(inputValue); }} className="input-form">
                    <input
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        placeholder={user ? "Ask anything..." : "Please sign in to chat"}
                        className="chat-input"
                        disabled={isLoading || !user}
                    />
                    <button type="submit" className="send-btn" disabled={isLoading || !inputValue.trim() || !user}>
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </footer>
      </main>
    </div>
  );
}
