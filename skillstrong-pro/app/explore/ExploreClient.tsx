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

const exploreContent = {
  skills: { title: "Explore by Job Category", prompts: ["CNC Machinist", "Welder", "Robotics Technician", "Industrial Maintenance", "Quality Control", "Logistics & Supply Chain"]},
  salary: { title: "Explore by Salary Range", prompts: ["What jobs pay $40k-$60k?", "Find roles making $60k-$80k", "What careers make $80k+?"]},
  training: { title: "Explore by Training Length", prompts: ["Programs under 3 months", "Training of 6-12 months", "Apprenticeships (1-2 years)"]}
};

const TypingIndicator = () => ( <div className="flex items-center space-x-2"> <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div> <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:0.2s]"></div> <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:0.4s]"></div> </div> );

export default function ExploreClient({ user }: { user: User | null }) {
    const router = useRouter();
    const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [currentFollowUps, setCurrentFollowUps] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeExploreTab, setActiveExploreTab] = useState<ExploreTab>('skills');
    const [inputValue, setInputValue] = useState("");
    const [location, setLocation] = useState<string | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const savedLocation = localStorage.getItem('skillstrong-location');
        if (savedLocation) {
            setLocation(savedLocation);
        }
        
        const initialize = () => {
            const quizResultsString = localStorage.getItem('skillstrong-quiz-results');
            if (quizResultsString) {
                localStorage.removeItem('skillstrong-quiz-results');
                if (!user) {
                    router.push('/account?message=Please sign up or sign in to see your quiz results.');
                    return;
                }
                const { answers } = JSON.parse(quizResultsString);
                const userMessage = "I just took the quiz. Based on my results, what careers do you recommend?";
                const newChat = createNewChat(false);
                const newHistory = [newChat, ...chatHistory];
                updateAndSaveHistory(newHistory);
                setActiveChatId(newChat.id);
                sendMessage(userMessage, newChat.id, { quiz_results: answers });
            } else {
                try {
                    const savedHistory = localStorage.getItem('skillstrong-chathistory');
                    const history = savedHistory ? JSON.parse(savedHistory) : [];
                    if (history.length > 0) {
                        setChatHistory(history);
                        setActiveChatId(history[0].id);
                    } else {
                        const newChat = createNewChat(true);
                        setChatHistory([newChat]);
                    }
                } catch (error) { 
                    console.error("Failed to load history:", error); 
                    const newChat = createNewChat(true);
                    setChatHistory([newChat]);
                }
            }
        };
        initialize();
    }, []);

    const activeChat = chatHistory.find(chat => chat.id === activeChatId);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [activeChat?.messages, isLoading]);

    const updateAndSaveHistory = (newHistory: ChatSession[]) => {
        const limitedHistory = newHistory.slice(0, 30);
        setChatHistory(limitedHistory);
        try { localStorage.setItem('skillstrong-chathistory', JSON.stringify(limitedHistory)); } catch (e) { console.error("Failed to save history:", e); }
    };
    
    const createNewChat = (setActive = true): ChatSession => {
        const newChat: ChatSession = { id: `chat-${Date.now()}`, title: "New Chat", messages: [], provider: 'openai' };
        if (setActive) {
            updateAndSaveHistory([newChat, ...chatHistory]);
            setActiveChatId(newChat.id);
            setCurrentFollowUps([]);
        }
        return newChat;
    };

    const handleProviderChange = (provider: 'openai' | 'gemini') => {
        if (!activeChatId) return;
        const newHistory = chatHistory.map(chat => 
            chat.id === activeChatId ? { ...chat, provider } : chat
        );
        updateAndSaveHistory(newHistory);
    };

    const handleResetActiveChat = () => {
        if (!activeChatId) return;
        const newHistory = chatHistory.map(chat => chat.id === activeChatId ? { ...chat, messages: [] } : chat);
        updateAndSaveHistory(newHistory);
        setCurrentFollowUps([]);
    };

    const handleChangeLocation = () => {
        const newLocation = prompt("Please enter your City, State, or ZIP code for local searches:", location || "");
        if (newLocation && newLocation.trim() !== "") {
            const trimmedLocation = newLocation.trim();
            setLocation(trimmedLocation);
            localStorage.setItem('skillstrong-location', trimmedLocation);
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
                location: location,
                ...additionalData
            };

            const response = await fetch(`/api/explore?provider=${currentChat?.provider || 'openai'}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!response.ok) throw new Error("API response was not ok.");

            const data = await response.json();
            const assistantMessage: Message = { role: 'assistant', content: data.answer };

            updatedHistory = updatedHistory.map(chat => {
                if (chat.id === chatId) {
                    const isFirstUserMessage = chat.messages.length === 1;
                    const newTitle = isFirstUserMessage ? "Quiz Results" : (chat.title === "New Chat" ? data.answer.substring(0, 35) + '...' : chat.title);
                    return { ...chat, messages: [...chat.messages, assistantMessage], title: newTitle };
                }
                return chat;
            });
            updateAndSaveHistory(updatedHistory);
            setCurrentFollowUps(data.followups || []);
        } catch (error) {
            console.error("Error sending message:", error);
            const errorMessage: Message = { role: 'assistant', content: "Sorry, I couldn't get a response. Please try again." };
            updatedHistory = updatedHistory.map(chat => 
                chat.id === chatId ? { ...chat, messages: [...chat.messages, errorMessage] } : chat
            );
            updateAndSaveHistory(updatedHistory);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
      <div className="flex h-screen bg-gray-100 text-gray-800">
        <aside>{/* ... same as before ... */}</aside>
        <div className="flex flex-1 flex-col h-screen">
            <header>{/* ... same as before ... */}</header>
            <main>{/* ... same as before ... */}</main>
            
            <footer className="p-4 bg-white/80 backdrop-blur-sm border-t">
                <div className="w-full max-w-3xl mx-auto">
                    {/* ... (follow-ups) ... */}
                    <form onSubmit={(e) => { e.preventDefault(); sendMessage(inputValue, activeChatId); }} className="flex items-center space-x-2">
                        {/* ... (input and send button) ... */}
                    </form>
                    <div className="text-center mt-2 h-4 text-xs text-gray-500">
                        {location ? (
                            <button onClick={handleChangeLocation} className="hover:text-gray-800 flex items-center justify-center mx-auto">
                                <MapPin className="w-3 h-3 mr-1"/> Searching near {location} (Change)
                            </button>
                        ) : (
                           <button onClick={handleChangeLocation} className="hover:text-gray-800">
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
