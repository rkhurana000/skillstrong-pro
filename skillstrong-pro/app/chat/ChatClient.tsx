// /app/chat/ChatClient.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
// UPDATED: Added Menu icon again (for expanding)
import { MessageSquarePlus, Send, Bot, Gem, Cpu, Printer, Flame, Wrench, ScanSearch, Handshake, Edit, MessageSquareText, Trash2, X, Menu } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useLocation } from '@/app/contexts/LocationContext';
import './chat.css'; // Ensure chat.css is imported

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
  { icon: Flame, title: 'Welding Programmer' },
  { icon: Cpu, title: 'Robotics Technologist' },
  { icon: Wrench, title: 'Maintenance tech' },
  { icon: Handshake, title: 'Quality Control Specialist' },
  { icon: Printer, title: 'Additive Manufacturing' },
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
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    // ADDED: State for confirmation dialog
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    const activeConversationId = activeConversation?.id;

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
        // Ensure sidebar is open when clicking history on mobile/small screens if needed
        // setIsSidebarCollapsed(false);
      } catch (error) {
        console.error("Error loading history:", error);
        createNewChat();
      } finally {
        setIsLoading(false);
      }
    };

    const saveConversation = async (convo: Partial<Conversation>): Promise<Conversation> => {
        // Title generation logic (unchanged)
        if (convo.messages?.length === 2 && (!convo.id || convo.id.startsWith('temp-'))) {
            // Check for existing title generation logic and duplicate handling
             const titleRes = await fetch('/api/title', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ messages: convo.messages }),
             });
             const { title: generatedTitle } = await titleRes.json();
            convo.title = generatedTitle || 'New Conversation';
        }

        const res = await fetch('/api/chat/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(convo), // Sends potentially updated title too
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

      const tempId = `temp-${Date.now()}`;
      setActiveConversation(prev => ({
        id: prev?.id || tempId,
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

        // Pass the potentially updated title from state
        const savedConvo = await saveConversation({
          id: isNewConversation ? undefined : activeConversationId,
          messages: newMessages,
          provider: currentProvider,
          title: activeConversation?.title, // Pass title from state
        });

        const finalConversationState: Conversation = {
            ...(activeConversation || { id: tempId, title: 'New Conversation' }),
            ...savedConvo, // savedConvo includes the final ID and potentially updated title
            messages: newMessages
        };
        setActiveConversation(finalConversationState);

        // Corrected History Update Logic
        setHistory(prev => {
            const newHistoryItem = { id: finalConversationState.id, title: finalConversationState.title, updated_at: finalConversationState.updated_at };
            // Filter out both temp ID and final ID before adding the new item
            const filteredPrev = prev.filter(h => h.id !== tempId && h.id !== finalConversationState.id);
            // Add the new item and sort
            return [newHistoryItem, ...filteredPrev].sort((a,b) => new Date(b.updated_at!).getTime() - new Date(a.updated_at!).getTime());
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

    // --- NEW: Clear History Function ---
    const handleClearHistory = async () => {
        if (!user) return; // Should not happen if button is shown
        setShowClearConfirm(false); // Close confirm dialog
        setIsLoading(true);
        try {
            const res = await fetch('/api/chat/history/clear', { method: 'POST' });
            if (!res.ok) throw new Error('Failed to clear history');
            setHistory([]);
            createNewChat(); // Go back to the welcome screen
        } catch (error) {
            console.error("Error clearing history:", error);
            // Optionally show an error message to the user
        } finally {
            setIsLoading(false);
        }
    };


    return (
      <div className="chat-container">
        {/* --- UPDATED SIDEBAR STRUCTURE --- */}
        <aside className={`chat-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
           <div className="sidebar-header-controls">
                {/* Always show the toggle button */}
                <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="sidebar-toggle"
                    title={isSidebarCollapsed ? "Expand menu" : "Collapse menu"}
                >
                  {/* Icon changes based on state */}
                  {isSidebarCollapsed ? <Menu size={20} /> : <X size={20} />}
                </button>

                {/* Conditionally render New Chat button text or icon */}
                {!isSidebarCollapsed && (
                    <button onClick={createNewChat} className="new-chat-btn-gemini-expanded" title="New Chat">
                         <Edit size={20} /> <span className="ml-2">New Chat</span>
                    </button>
                )}
                 {isSidebarCollapsed && (
                    <button onClick={createNewChat} className="new-chat-btn-gemini-collapsed" title="New Chat">
                        <Edit size={20} />
                    </button>
                 )}

                {/* Conditionally render Clear History - always icon only in collapsed */}
                {user && history.length > 0 && (
                    <button
                        onClick={() => setShowClearConfirm(true)}
                        className={`clear-history-btn ${isSidebarCollapsed ? 'collapsed' : ''}`}
                        title="Clear History"
                    >
                        <Trash2 size={isSidebarCollapsed ? 20 : 18} />
                    </button>
                )}
           </div>

           {/* History List - only render content when NOT collapsed */}
           {!isSidebarCollapsed && (
             <nav className="history-list">
               {history.map(item => (
                 <button // Changed div to button for better accessibility
                   key={item.id}
                   className={`history-item ${item.id === activeConversationId ? 'active' : ''}`}
                   onClick={() => handleHistoryClick(item.id)}
                   title={item.title}
                 >
                   {item.title}
                 </button>
               ))}
             </nav>
           )}
        </aside>

        {/* --- MAIN PANEL (No Changes) --- */}
        <main className="chat-main">
          {/* ... (Chat Header, Messages, Footer remain the same) ... */}
           <div className="chat-header">
             <h3>Coach Mach</h3>
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
                <p>Select a category to begin exploring, or ask anything.</p>
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

        {/* --- Confirmation Dialog (No Changes) --- */}
        {showClearConfirm && (
             <div className="clear-confirm-backdrop">
                {/* ... (dialog remains the same) ... */}
                 <div className="clear-confirm-dialog">
                     <h4>Clear Chat History?</h4>
                     <p>This will permanently delete all your conversations.</p>
                     <div className="clear-confirm-actions">
                         <button onClick={() => setShowClearConfirm(false)} className="cancel-btn">Cancel</button>
                         <button onClick={handleClearHistory} className="confirm-btn">Clear History</button>
                     </div>
                 </div>
             </div>
        )}
      </div>
    );
}
