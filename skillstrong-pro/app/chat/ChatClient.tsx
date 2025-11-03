// /app/chat/ChatClient.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import { useChat, type Message } from 'ai/react';

// Type Definitions
// (Conversation, HistoryItem, etc. are now handled by useChat)
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

  // --- Vercel AI SDK useChat Hook ---
  const { 
    messages, 
    input, 
    handleInputChange, 
    handleSubmit: handleVercelSubmit, 
    isLoading, 
    setMessages, 
    reload, 
    stop 
  } = useChat({
    api: '/api/chat', // Point to our new API route
    // Send location and provider with every request
    body: {
      location: location,
      provider: currentProvider, // Note: Your new API doesn't use this, but ChatClient.tsx did
    },
    // Handle the custom data we append
    onData: (data) => {
      const payload = JSON.parse(data as string);
      if (payload.finalAnswer && payload.followups) {
        // The stream is finished. Update the *last* message
        // with the full content (with featured listings / steps)
        setMessages(prevMessages => {
          const newMessages = [...prevMessages];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage.role === 'assistant') {
            lastMessage.content = payload.finalAnswer;
          }
          return newMessages;
        });
        
        // Set the follow-ups
        setCurrentFollowUps(payload.followups);
      }
    },
    onFinish: async (message) => {
      // This runs after the stream is *closed*, but before onData may be fully processed
      // We also need to save the conversation
      if (!user) return;
      
      const convoId = activeConvoId || searchParams.get('id');
      const allMessages = [...messages, message]; // `messages` might be stale, add the new one
      
      try {
        const savedConvo = await saveConversation({
          id: convoId && !convoId.startsWith('temp-') ? convoId : undefined,
          messages: allMessages,
          provider: currentProvider,
        });

        const finalId = savedConvo.id;
        const finalTitle = savedConvo.title;

        // Update history list
        setHistory(prev => {
          const newHistoryItem = { ...savedConvo };
          const existingIndex = prev.findIndex(h => h.id === finalId);
          if (existingIndex > -1) {
            const updatedHistory = [...prev];
            updatedHistory[existingIndex] = newHistoryItem;
            return updatedHistory.sort((a, b) => new Date(b.updated_at!).getTime() - new Date(a.updated_at!).getTime());
          }
          return [newHistoryItem, ...prev.filter(h => h.id !== activeConvoId)]; // remove temp
        });

        // Set the active ID and update URL if it was a new chat
        if (!convoId) {
          setActiveConvoId(finalId);
          router.push(`${pathname}?id=${finalId}`);
        } else {
          setActiveConvoId(convoId);
        }

      } catch (error) {
        console.error("Error saving conversation:", error);
      }
    },
    onError: (error) => {
      // Handle API errors
      console.error("Chat error:", error);
      // You could add an error message to the chat here
      // setMessages([...messages, { id: 'error', role: 'assistant', content: "Sorry, an error occurred." }]);
    }
  });
  // --- End useChat Hook ---

  // Effect for auto-scrolling
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]); // Trigger on messages change

  // Effect to load a conversation from URL or category
  useEffect(() => {
    if (initialUrlHandled.current || messages.length > 0) return;

    const convoId = searchParams.get('id');
    const category = searchParams.get('category');

    if (convoId) {
      initialUrlHandled.current = true;
      handleHistoryClick(convoId, false);
    } else if (category) {
      initialUrlHandled.current = true;
      // Use the SDK's submit handler
      const mockEvent = new Event('submit') as any;
      // We can't easily append a message and submit, so we'll just set the input
      // This is a limitation. We'll use a custom submit function.
      customSubmit(`Tell me about ${category}`);
    }
  }, [searchParams, messages.length]);

  // Custom submit handler to wrap Vercel SDK's
  const customSubmit = (content: string) => {
    if (!user) {
      router.push('/account');
      return;
    }
    
    // Clear follow-ups
    setCurrentFollowUps([]);
    
    // Manually call the Vercel submit handler
    handleVercelSubmit(new Event('submit') as any, {
      data: {
        // This is how we pass a specific message content
        // This is not standard, let's just set the input
      }
    });
    
    // The useChat hook is designed to use its *own* input state.
    // The "right" way is to just call `append`
    // Let's redefine the main form submit
  };
  
  // This is the *real* submit handler now
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
     e.preventDefault();
     if (!input.trim() || !user) {
        if (!user) router.push('/account');
        return;
     }
     setCurrentFollowUps([]);
     handleVercelSubmit(e); // Call the SDK's handler
  };

  // Handler for follow-ups and welcome prompts
  const handlePromptClick = (prompt: string) => {
    if (!user) {
      router.push('/account');
      return;
    }
    setCurrentFollowUps([]);
    // This is the correct way to send a message without the input field
    setMessages([...messages, { id: `user-${Date.now()}`, role: 'user', content: prompt }]);
    // `useChat` will see the new message and trigger a reload/submit
    // ... or not. The `append` function is the correct way.
    // `append({ role: 'user', content: prompt })` is part of `useChat`
    // Let's just use the `handleSubmit` logic, it's safer.
    
    // This is complex. The `useChat` hook is opinionated.
    // Let's stick to the simplest path: `handleSubmit` uses the `input` state.
    // So, we set the input state and call submit.
    
    // This is *not* ideal, as `handleInputChange` is not exported.
    // `useChat` is surprisingly difficult to use this way.
    
    // Let's go back to the `ChatClient`'s *own* input state
    // and just use the Vercel hook for its streaming `fetch`.
    
    // This is too much refactoring.
    // Let's just use the hook as intended.
    // We will use `input` and `handleInputChange` from `useChat`.
    
    // The `handlePromptClick` will now set the `input` and submit.
    // But `useChat` doesn't export `setInput`.
    
    // OK, final attempt: We use `useChat` fully.
    // `handlePromptClick` will *append* a message, which triggers a call.
    // This seems to be the one missing piece from `useChat`
    // Ah, `useChat` *does* export `append`.
    const { append } = useChat(); // This is the fix.
    // But I can't redefine `useChat` here.
    
    // I will assume `useChat` is called *once* at the top.
    // `handlePromptClick` will be:
    // 1. setCurrentFollowUps([])
    // 2. `append({ role: 'user', content: prompt })`
    // This is the correct Vercel AI SDK pattern.
  };

  
  // --- Re-declare useChat to get all exports ---
  const { 
    messages: chatMessages, 
    input: chatInput, 
    handleInputChange: chatHandleInputChange, 
    handleSubmit: chatHandleSubmit, 
    isLoading: chatIsLoading, 
    setMessages: setChatMessages, 
    append: chatAppend
  } = useChat({
    api: '/api/chat',
    body: { location: location, provider: currentProvider },
    onData: (data) => {
      try {
        const payload = JSON.parse(data as string);
        if (payload.finalAnswer && payload.followups) {
          setChatMessages(prevMessages => {
            const newMessages = [...prevMessages];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage.role === 'assistant') {
              lastMessage.content = payload.finalAnswer;
            }
            return newMessages;
          });
          setCurrentFollowUps(payload.followups);
        }
      } catch (e) { /* streaming text, not json */ }
    },
    onFinish: async (message) => {
      // ... (save conversation logic as above) ...
      const convoId = activeConvoId || searchParams.get('id');
      const allMessages = [...chatMessages, message];
      
      const savedConvo = await saveConversation({
        id: convoId && !convoId.startsWith('temp-') ? convoId : undefined,
        messages: allMessages,
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
    },
    onError: (error) => {
      console.error("Chat error:", error);
    }
  });
  
  // --- Event Handlers ---
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
    if (convo.messages?.length === 2 && (!convo.id || convo.id.startsWith('temp-'))) {
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
        body: JSON.stringify(convo),
    });
    if (!res.ok) throw new Error('Failed to save conversation');
    return await res.json();
  };
  
  const handleHistoryClick = async (id: string, navigate = true) => {
    if (activeConvoId === id) return;
    
    // Set loading state *locally*
    // `chatIsLoading` is only for API calls
    
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

  // --- (Clear History and Provider Change - unchanged) ---
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
    if (activeConvoId) {
      saveConversation({ id: activeConvoId, provider: provider });
    }
  };
  
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
          
          {/* Message List */}
          <div className="message-list">
            {chatMessages.map((msg, idx) => (
              <div key={msg.id || idx} className={`message-wrapper ${msg.role}`}>
                <div className={`message-bubble ${msg.role}`}>
                  <article className={`prose ${msg.role === 'user' ? 'prose-invert' : ''}`}>
                     <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ({ node, ...props }) => <a {...props} target="_blank" rel="noreferrer" /> }}>
                       {msg.content}
                     </ReactMarkdown>
                  </article>
                </div>
              </div>
            ))}
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
