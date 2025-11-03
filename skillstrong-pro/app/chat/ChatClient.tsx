// /app/chat/ChatClient.tsx
'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react'; // Added useMemo
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { 
  MessageSquarePlus, Send, Bot, Gem, Cpu, Printer, Flame, 
  Wrench, ScanSearch, Handshake, Edit, Trash2, X, Menu 
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useLocation } from '@/app/contexts/LocationContext';
import './chat.css'; // Ensure chat.css is imported

// Import Vercel AI SDK hook
import { useChat, type Message } from 'ai/react'; // <--- Vercel AI SDK v3 import

// Type Definitions
type HistoryItem = { id: string; title: string; updated_at?: string; provider: 'openai' | 'gemini' };

// --- Welcome components (unchanged) ---
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
// --- End Welcome components ---


export default function ChatClient({ user, initialHistory }: { user: User | null; initialHistory: HistoryItem[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [history, setHistory] = useState<HistoryItem[]>(initialHistory);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [currentProvider, setCurrentProvider] = useState<'openai' | 'gemini'>('openai');
  const [currentFollowUps, setCurrentFollowUps] = useState<string[]>([]);
  const { location } = useLocation();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const initialUrlHandled = useRef(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  // --- useChat Hook ---
  const { 
    messages: chatMessages, 
    input: chatInput, 
    handleInputChange: chatHandleInputChange, 
    handleSubmit: chatHandleSubmit, 
    isLoading: chatIsLoading, 
    setMessages: setChatMessages, 
    append: chatAppend,
    data: chatData, // v3 uses `data` for the appended JSON
  } = useChat({
    api: '/api/chat',
    body: { location: location, provider: currentProvider },
    // --- FIX #1 & #2: Updated onFinish handler ---
    onFinish: async (message) => {
      // `message` is the final message object from the hook (with unenriched content)
      
      let finalAnswer = message.content;
      let followups: string[] = [];

      // FIX #2: Parse chatData *inside* onFinish to get the latest data
      let finalData = null;
      if (chatData && chatData.length > 0) {
        for (let i = chatData.length - 1; i >= 0; i--) {
          try {
            // Data is appended as JSON strings, find the last valid one
            const parsed = JSON.parse((chatData as any)[i]);
            if (parsed.finalAnswer) {
              finalData = parsed;
              break;
            }
          } catch (e) { /* ignore parse errors */ }
        }
      }

      // If we found enriched data, use it
      if (finalData) { 
        finalAnswer = finalData.finalAnswer;
        followups = finalData.followups;
      }
      
      // Always set followups (even if empty)
      setCurrentFollowUps(followups);

      // Now, save the conversation to the DB with the *enriched* finalAnswer
      const convoId = activeConvoId || searchParams.get('id');
      const currentMessages = [...chatMessages, message]; // Get messages *from the hook*

      const finalMessagesForSave = currentMessages.map(m => {
        if (m.id === message.id) {
          // Save the message with the *enriched* content
          return { ...m, content: finalAnswer };
        }
        return m;
      });
      
      try {
        const savedConvo = await saveConversation({
          id: convoId && !convoId.startsWith('temp-') ? convoId : undefined,
          messages: finalMessagesForSave,
          provider: currentProvider,
        });
        
        const finalId = savedConvo.id;
        setHistory(prev => {
          const newHistoryItem = { ...savedConvo };
          const existing = prev.find(h => h.id === finalId);
          if (existing) {
            return prev.map(h => h.id === finalId ? newHistoryItem : h).sort((a, b) => new Date(b.updated_at!).getTime() - new Date(a.updated_at!).getTime());
          }
          return [newHistoryItem, ...prev.filter(h => h.id !== activeConvoId)].sort((a, b) => new Date(b.updated_at!).getTime() - new Date(a.updated_at!).getTime());
        });

        if (!convoId || convoId.startsWith('temp-')) {
          setActiveConvoId(finalId);
          router.push(`${pathname}?id=${finalId}`);
        } else {
          setActiveConvoId(convoId);
        }
      } catch (saveError) {
        console.error("Failed to save conversation:", saveError);
      }
    },
    onError: (error) => {
      console.error("Chat error:", error);
    }
  });

  // --- FIX #1: Logic to get final answer for rendering ---
  // Use useMemo to parse the chatData stream efficiently for rendering
  const lastValidData = useMemo(() => {
    if (!chatData || chatData.length === 0) return null;
    for (let i = chatData.length - 1; i >= 0; i--) {
      try {
        const parsed = JSON.parse((chatData as any)[i]);
        if (parsed.finalAnswer) {
          return parsed;
        }
      } catch (e) { /* ignore */ }
    }
    return null;
  }, [chatData]);
  
  // --- Event Handlers (Unchanged) ---
  const handleMainSubmit = (e: React.FormEvent<HTMLFormElement>) => {
     if (!user) { router.push('/account'); return; }
     setCurrentFollowUps([]);
     chatHandleSubmit(e);
  };
  
  const handlePromptClickSubmit = (prompt: string) => {
    if (!user) { router.push('/account'); return; }
    setCurrentFollowUps([]);
    chatAppend({ role: 'user', content: prompt });
  };
  
  const createNewChat = () => {
    setChatMessages([]); // Clear messages from SDK
    setActiveConvoId(null);
    setCurrentFollowUps([]);
    initialUrlHandled.current = true; // Mark as handled
    router.push(pathname);
  };
  
  const saveConversation = async (convo: Partial<any>): Promise<HistoryItem> => {
    // Generate title
    if (convo.messages?.length === 2 && (!convo.id || convo.id.startsWith('temp-'))) {
       const titleRes = await fetch('/api/title', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ messages: convo.messages }),
       });
       const { title: generatedTitle } = await titleRes.json();
      convo.title = generatedTitle || 'New Conversation';
    }
    
    // Save to DB
    const res = await fetch('/api/chat/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(convo),
    });
    if (!res.ok) {
       const err = await res.json();
       console.error("Failed to save convo:", err);
       throw new Error(err.error || 'Failed to save conversation');
    }
    return await res.json();
  };
  
  const handleHistoryClick = async (id: string, navigate = true) => {
    if (activeConvoId === id && chatMessages.length > 0) return; // Already on it
    
    initialUrlHandled.current = true;
    try {
      const res = await fetch(`/api/chat/conversation?id=${id}`);
      if (!res.ok) throw new Error('Failed to fetch conversation');
      const convo: any = await res.json();
      
      setChatMessages(convo.messages || []); // Load messages into SDK
      setActiveConvoId(convo.id);
      setCurrentProvider(convo.provider || 'openai');
      setCurrentFollowUps([]); // Clear old follow-ups
      
      if (navigate) {
        router.push(`${pathname}?id=${id}`);
      }
    } catch (error) {
      console.error("Error loading history:", error);
      createNewChat();
    }
  };

  const handleClearHistory = async () => {
    if (!user) return;
    setShowClearConfirm(false);
    try {
        await fetch('/api/chat/history/clear', { method: 'POST' });
        setHistory([]);
        createNewChat();
    } catch (error) {
        console.error("Error clearing history:", error);
    }
  };

  const handleProviderChange = (provider: 'openai' | 'gemini') => {
    setCurrentProvider(provider);
    if (activeConvoId && !activeConvoId.startsWith('temp-')) {
      saveConversation({ id: activeConvoId, provider: provider });
    }
  };

  // Effect to load convo from URL (needs to run *after* SDK is initialized)
   useEffect(() => {
    if (initialUrlHandled.current || chatMessages.length > 0) return;

    const convoId = searchParams.get('id');
    const category = searchParams.get('category');
    const newChat = searchParams.get('newChat'); // Check for newChat param

    if (convoId) {
      initialUrlHandled.current = true;
      handleHistoryClick(convoId, false);
    } else if (category) {
      initialUrlHandled.current = true;
      handlePromptClickSubmit(`Tell me about ${category}`);
    } else if (newChat) { // Handle newChat param
        initialUrlHandled.current = true;
        createNewChat(); // Start a new chat
    }
  }, [searchParams, chatMessages.length]); // Re-run if searchParams change

  // Effect for auto-scrolling
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, chatIsLoading]); // Trigger on messages change OR loading state
  
  
  // --- Render ---
  return (
    <div className="chat-container">
      {/* --- Sidebar (Unchanged) --- */}
      <aside className={`chat-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
         <div className="sidebar-header-controls">
              <button
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className="sidebar-toggle"
                  title={isSidebarCollapsed ? "Expand menu" : "Collapse menu"}
              >
                {isSidebarCollapsed ? <Menu size={20} /> : <X size={20} />}
              </button>
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
         {!isSidebarCollapsed && (
           <nav className="history-list">
             {history.map(item => (
               <button
                 key={item.id}
                 className={`history-item ${item.id === activeConvoId ? 'active' : ''}`}
                 onClick={() => handleHistoryClick(item.id)}
                 title={item.title}
               >
                 {item.title}
               </button>
             ))}
           </nav>
         )}
      </aside>

      {/* --- Main Panel --- */}
      <main className="chat-main">
         <div className="chat-header">
           <h3>Coach Mach</h3>
           {chatMessages.length > 0 && ( // Only show provider switch if in a chat
             <div className="provider-switch">
               <button onClick={() => handleProviderChange('openai')} className={currentProvider === 'openai' ? 'active' : ''}><Bot size={16}/> GPT-4o</button>
               <button onClick={() => handleProviderChange('gemini')} className={currentProvider === 'gemini' ? 'active' : ''}><Gem size={16}/> Gemini</button>
             </div>
           )}
         </div>
         
         <div ref={chatContainerRef} className="chat-messages">
          {/* Welcome View */}
          {chatMessages.length === 0 && !chatIsLoading && (
            <div className="welcome-view">
              <Bot size={48} className="text-blue-600 mb-4" />
              <h2>Start a Conversation</h2>
              <p>Select a category to begin exploring, or ask anything.</p>
              <div className="explore-grid">
                {welcomeCareers.map(({icon: Icon, title}) => (
                  <button key={title} onClick={() => handlePromptClickSubmit(`Tell me about ${title}`)} className="explore-btn" style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                    <Icon className="h-8 w-8 text-blue-600" />
                    {title}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* --- FIX #1: Updated Message List Rendering --- */}
          <div className="message-list">
            {chatMessages.map((msg, idx) => {
              // Check if this is the last assistant message
              const isLastAssistantMessage = msg.role === 'assistant' && idx === chatMessages.length - 1;
              
              // Determine content: Use enriched answer if available for the last message
              const contentToRender = isLastAssistantMessage && lastValidData && !chatIsLoading
                ? lastValidData.finalAnswer 
                : msg.content;
              
              return (
                <div key={msg.id} className={`message-wrapper ${msg.role}`}>
                  <div className={`message-bubble ${msg.role}`}>
                    <article className={`prose ${msg.role === 'user' ? 'prose-invert' : ''}`}>
                       <ReactMarkdown remarkPlugins={[remarkGfm as any]} components={{ a: ({ node, ...props }) => <a {...props} target="_blank" rel="noreferrer" /> }}>
                         {contentToRender}
                       </ReactMarkdown>
                    </article>
                  </div>
                </div>
              );
            })}
            
            {/* Typing indicator logic: show if loading AND last message is user */}
            {chatIsLoading && chatMessages[chatMessages.length - 1]?.role === 'user' && (
               <div className="message-wrapper assistant">
                 <div className="message-bubble assistant">
                    <TypingIndicator />
                 </div>
               </div>
            )}
          </div>
        </div>
         
         <footer className="chat-footer">
             <div className="footer-content">
                 {/* Follow-ups will now be set correctly by onFinish */}
                 {currentFollowUps.length > 0 && !chatIsLoading && (
                     <div className="follow-ups">
                         {currentFollowUps.map((prompt, i) => (
                             <button key={i} onClick={() => handlePromptClickSubmit(prompt)} className="follow-up-btn">
                                 {prompt}
                             </button>
                         ))}
                     </div>
                 )}
                 <form onSubmit={handleMainSubmit} className="input-form">
                     <input
                         value={chatInput}
                         onChange={chatHandleInputChange}
                         placeholder={user ? "Ask anything..." : "Please sign in to chat"}
                         className="chat-input"
                         disabled={chatIsLoading || !user}
                     />
                     <button type="submit" className="send-btn" disabled={chatIsLoading || !chatInput.trim() || !user}>
                         <Send size={20} />
                     </button>
                 </form>
             </div>
         </footer>
      </main>

      {/* --- Confirmation Dialog (Unchanged) --- */}
      {showClearConfirm && (
           <div className="clear-confirm-backdrop">
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
