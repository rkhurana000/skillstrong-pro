// /app/chat/ChatClient.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { MessageSquarePlus, Send, Bot, Gem, Cpu, Printer, Flame, Wrench, ScanSearch, Handshake } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useLocation } from '@/app/contexts/LocationContext';
import './chat.css';

// Type Definitions
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

const welcomeCareers = [
  { icon: ScanSearch, title: 'CNC Machinist' },
  { icon: Flame, title: 'Welder' },
  { icon: Cpu, title: 'Robotics Technician' },
  { icon: Wrench, title: 'Industrial Maintenance' },
  { icon: Handshake, title: 'Quality Control' },
  { icon: Printer, title: 'Logistics & Supply Chain' },
];

const TypingIndicator = () => (
  <div className="flex items-center space-x-2 p-2">
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:0.2s]" />
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:0.4s]" />
  </div>
);

export default function ChatClient({ user, initialHistory }: { user: User | null; initialHistory: HistoryItem[] }) {
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
    const initialUrlHandled = useRef(false);

    const activeConversationId = activeConversation?.id || null;

    useEffect(() => {
      if (chatContainerRef.current) {
        setTimeout(() => {
          chatContainerRef.current!.scrollTop = chatContainerRef.current!.scrollHeight;
        }, 100);
      }
    }, [activeConversation?.messages, isLoading]);

    useEffect(() => {
      if (initialUrlHandled.current) return;

      const convoId = searchParams.get('id');
      const category = searchParams.get('category');
      
      if (convoId) {
        initialUrlHandled.current = true;
        handleHistoryClick(convoId, false);
      } else if (category) {
        initialUrlHandled.current = true;
        sendMessage(`Tell me about ${category}`);
      }
    }, [searchParams]);

    const createNewChat = () => {
      setActiveConversation(null);
      setCurrentFollowUps([]);
      initialUrlHandled.current = true;
      router.push(pathname);
    };

    const handleHistoryClick = async (id: string, navigate = true) => {
      if (activeConversationId === id) return;
      setIsLoading(true);
      initialUrlHandled.current = true;
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
        console.error("Error loading history:", error);
        createNewChat();
      } finally {
        setIsLoading(false);
      }
    };
    
    const saveConversation = async (convo: Partial<Conversation>): Promise<Conversation> => {
        if (convo.messages?.length === 2 && (!convo.id || convo.id.startsWith('temp-'))) {
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
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to save to DB');
        }
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
      
      const isNewConversation = !activeConversationId || activeConversationId.startsWith('temp-');
      const currentMessages: Message[] = activeConversation?.messages || [];
      const newUserMessage: Message = { role: 'user', content: text };
      const messages = [...currentMessages, newUserMessage];
      
      const currentProvider = activeConversation?.provider || 'openai';
      
      setActiveConversation(prev => ({
        id: prev?.id || `temp-${Date.now()}`,
        title: prev?.title || 'New Conversation',
        messages,
        provider: currentProvider,
      }));
      
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages, location, provider: currentProvider }),
        });
        
        if (!res.ok) throw new Error('Failed to get AI response');
        const data: { answer: string; followups: string[] } = await res.json();
        
        const newMessages: Message[] = [...messages, { role: 'assistant', content: data.answer }];
        
        const savedConvo = await saveConversation({
          id: isNewConversation ? undefined : activeConversationId,
          messages: newMessages,
          provider: currentProvider,
          title: activeConversation?.title,
        });
        
        const finalConversationState: Conversation = {
            ...activeConversation,
            ...savedConvo,
            messages: newMessages
        };
        setActiveConversation(finalConversationState);
        
        setHistory(prev => {
            const newHistoryItem = { id: finalConversationState.id, title: finalConversationState.title, updated_at: finalConversationState.updated_at };
            const existingIndex = prev.findIndex(h => h.id === activeConversationId); // Use old ID for finding
            let updatedHistory;
            if (isNewConversation || existingIndex === -1) {
                updatedHistory = [newHistoryItem, ...prev];
            } else {
                updatedHistory = [...prev];
                updatedHistory[existingIndex] = newHistoryItem;
            }
            return updatedHistory.sort((a,b) => new Date(b.updated_at!).getTime() - new Date(a.updated_at!).getTime());
        });

        if (isNewConversation) {
          router.push(`${pathname}?id=${savedConvo.id}`);
        }
        
        setCurrentFollowUps(data.followups || []);
      } catch (error) {
        console.error("Error in sendMessage:", error);
        const errorMsg: Message = { role: 'assistant', content: "Sorry, an error occurred. Please try again." };
        setActiveConversation(prev => ({ ...prev!, messages: [...messages, errorMsg] }));
      } finally {
        setIsLoading(false);
      }
    };
    
    const handleProviderChange = (provider: 'openai' | 'gemini') => {
      if (!activeConversation) return;
      const updatedConvo = { ...activeConversation, provider };
      setActiveConversation(updatedConvo);
      saveConversation(updatedConvo);
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
          <div className="chat-header">
            <h3>SkillStrong Coach</h3>
            {activeConversation && (
              <div className="provider-switch">
                <button onClick={() => handleProviderChange('openai')} className={activeConversation.provider === 'openai' ? 'active' : ''}><Bot size={16}/> GPT-4o</button>
                <button onClick={() => handleProviderChange('gemini')} className={activeConversation.provider === 'gemini' ? 'active' : ''}><Gem size={16}/> Gemini</button>
              </div>
            )}
          </div>
          <div ref={chatContainerRef} className="chat-messages">
            {!activeConversation ? (
              <div className="welcome-view">
                <Bot size={48} className="text-blue-600 mb-4" />
                <h2>Start a Conversation</h2>
                <p>Select a category to begin exploring.</p>
                <div className="explore-grid">
                  {welcomeCareers.map(({icon: Icon, title}) => (
                    <button key={title} onClick={() => sendMessage(`Tell me about ${title}`)} className="explore-btn" style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                      <Icon className="h-8 w-8 text-blue-600" />
                      {title}
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
                         <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ({ node, ...props }) => <a {...props} target="_blank" rel="noreferrer" /> }}>
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
