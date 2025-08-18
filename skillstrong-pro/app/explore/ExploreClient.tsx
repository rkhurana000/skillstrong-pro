// /app/explore/ExploreClient.tsx
'use client'

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { Sparkles, MessageSquarePlus, MessageSquareText, ArrowRight, Send, Bot as OpenAIIcon, Gem, MapPin } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Type Definitions
type Role = "user" | "assistant";
interface Message { role: Role; content: string; }
interface ChatSession { id: string; title: string; messages: Message[]; provider: 'openai' | 'gemini'; }
type ExploreTab = 'skills' | 'salary' | 'training';

const exploreContent = { /* ... (same as before) ... */ };
const TypingIndicator = () => ( /* ... (same as before) ... */ );

export default function ExploreClient({ user }: { user: User | null }) {
    const router = useRouter();
    const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [currentFollowUps, setCurrentFollowUps] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeExploreTab, setActiveExploreTab] = useState<ExploreTab>('skills');
    const [inputValue, setInputValue] = useState("");
    const [location, setLocation] = useState<string | null>(null); // New state for location
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Load saved location on startup
        const savedLocation = localStorage.getItem('skillstrong-location');
        if (savedLocation) {
            setLocation(savedLocation);
        }

        // Initialize chat (quiz or history)
        const initialize = () => { /* ... (same initialization logic as before) ... */ };
        initialize();
    }, []);

    const activeChat = chatHistory.find(chat => chat.id === activeChatId);
    useEffect(() => { /* ... (same scroll logic as before) ... */ }, [activeChat?.messages, isLoading]);

    const updateAndSaveHistory = (newHistory: ChatSession[]) => { /* ... (same as before) ... */ };
    const createNewChat = (setActive = true): ChatSession => { /* ... (same as before) ... */ };
    const handleResetActiveChat = () => { /* ... (same as before) ... */ };
    
    const handleProviderChange = (provider: 'openai' | 'gemini') => {
        if (!activeChatId) return;
        const newHistory = chatHistory.map(chat => 
            chat.id === activeChatId ? { ...chat, provider } : chat
        );
        updateAndSaveHistory(newHistory);
    };
    
    const handleChangeLocation = () => {
        const newLocation = prompt("Please enter your City, State, or ZIP code:", location || "");
        if (newLocation) {
            setLocation(newLocation);
            localStorage.setItem('skillstrong-location', newLocation);
        }
    };

    const sendMessage = async (query: string, chatId: string | null, additionalData = {}) => {
        if (!user) {
            router.push('/account?message=Please sign up or sign in to start a chat.');
            return;
        }
        if (isLoading || !chatId) return;

        const newUserMessage: Message = { role: 'user', content: query };
        let updatedHistory = chatHistory.map(chat => 
            chat.id === chatId ? { ...chat, messages: [...chat.messages, newUserMessage] } : chat
        );
        updateAndSaveHistory(updatedHistory);
        setInputValue("");
        setCurrentFollowUps([]);
        setIsLoading(true);

        try {
            const currentChat = updatedHistory.find(c => c.id === chatId);
            const body = {
                messages: currentChat?.messages || [],
                location: location, // Always send the current location
                ...additionalData
            };

            const response = await fetch(`/api/explore?provider=${currentChat?.provider || 'openai'}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
            });

            if (!response.ok) throw new Error("API response not ok.");

            const data = await response.json();
            const assistantMessage: Message = { role: 'assistant', content: data.answer };

            // Logic to check if the AI is asking for a location
            if (data.answer.toLowerCase().includes("city, state, or zip code")) {
                const newLocation = prompt(data.answer);
                if (newLocation) {
                    setLocation(newLocation);
                    localStorage.setItem('skillstrong-location', newLocation);
                    // Resend original query, now with location
                    sendMessage(query, chatId, additionalData);
                    return; // Stop execution of this thread
                }
            }

            // ... (rest of the state update logic for history and titles is the same)
            
        } catch (error) {
            // ... (error handling is the same) ...
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
      <div className="flex h-screen bg-gray-100 text-gray-800">
        <aside>{/* ... (same as before) ... */}</aside>
        
        <div className="flex flex-1 flex-col h-screen">
            <header className="p-4 border-b bg-white shadow-sm flex justify-between items-center">
                <h1 className="text-xl font-bold text-gray-800 flex items-center"> <Sparkles className="w-6 h-6 mr-2 text-blue-500" /> SkillStrong Coach </h1>
                {activeChat && (
                  <div className="flex items-center space-x-2 p-1 bg-gray-100 rounded-full">
                    <button onClick={() => handleProviderChange('openai')} disabled={isLoading} className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${activeChat.provider === 'openai' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:bg-gray-200'} disabled:opacity-50`}>
                      <OpenAIIcon className="w-4 h-4 inline-block mr-1" /> GPT-4o
                    </button>
                    <button onClick={() => handleProviderChange('gemini')} disabled={isLoading} className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${activeChat.provider === 'gemini' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:bg-gray-200'} disabled:opacity-50`}>
                      <Gem className="w-4 h-4 inline-block mr-1" /> Gemini
                    </button>
                  </div>
                )}
            </header>
            
            <main>{/* ... (same as before) ... */}</main>
            
            <footer className="p-4 bg-white/80 backdrop-blur-sm border-t">
                <div className="w-full max-w-3xl mx-auto">
                    {/* ... (follow-ups are the same) ... */}
                    <form onSubmit={(e) => { e.preventDefault(); sendMessage(inputValue, activeChatId); }} className="flex items-center space-x-2">
                        <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Ask anything or enter your location..." disabled={isLoading} 
                            className="w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-50" />
                        <button type="submit" disabled={isLoading || !inputValue.trim()} className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-400 transition-colors"> <Send className="w-5 h-5" /> </button>
                    </form>
                    {/* --- NEW: LOCATION INDICATOR AND CHANGER --- */}
                    <div className="text-center mt-2">
                        {location ? (
                            <button onClick={handleChangeLocation} className="text-xs text-gray-500 hover:text-gray-800 flex items-center justify-center mx-auto">
                                <MapPin className="w-3 h-3 mr-1"/> Searching near {location} (Change)
                            </button>
                        ) : (
                            <button onClick={handleChangeLocation} className="text-xs text-gray-500 hover:text-gray-800">
                                Set Location for Local Results
                            </button>
                        )}
                    </div>
                </div>
            </footer>
        </div>
      </div>
    );
}
