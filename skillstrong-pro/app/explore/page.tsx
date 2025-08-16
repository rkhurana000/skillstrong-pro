// /app/explore/page.tsx

"use client";

import { useState, useEffect, useRef } from 'react';
import { Bot, Gem, Sparkles, MessageSquarePlus, MessageSquareText, ArrowRight, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// (Type definitions and exploreContent are the same as before)
type Role = "user" | "assistant";
interface Message { role: Role; content: string; }
interface ChatSession { id: string; title: string; messages: Message[]; provider: 'openai' | 'gemini'; followUps?: string[]; }
type ExploreTab = 'skills' | 'salary' | 'training';
const exploreContent = { /* ... same as before ... */ };

export default function ExplorePage() {
  // (State declarations are mostly the same, with one new addition)
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeExploreTab, setActiveExploreTab] = useState<ExploreTab>('skills');
  const [inputValue, setInputValue] = useState(""); // <-- NEW: For text input
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  
  useEffect(() => {
    // --- NEW: QUIZ RESULT HANDLING ---
    const quizResultsString = localStorage.getItem('skillstrong-quiz-results');
    if (quizResultsString) {
      localStorage.removeItem('skillstrong-quiz-results'); // Clear it so it doesn't run again
      const { answers, questions } = JSON.parse(quizResultsString);
      
      let quizSummary = "I just took the interest quiz. Here are my ratings (1=Disagree, 5=Agree):\n";
      questions.forEach((q: string, i: number) => {
        quizSummary += `* ${q}: ${answers[i]}\n`;
      });
      quizSummary += "\nBased on these results, what manufacturing roles are a good fit for me?";

      const newChat = handleNewChat(false); // Create new chat but don't switch to it yet
      sendMessage(quizSummary, newChat.id); // Send the quiz summary as the first message
    } else {
       // --- Existing logic to load chat history ---
      try {
        const savedHistory = localStorage.getItem('skillstrong-chathistory');
        if (savedHistory) {
          const history = JSON.parse(savedHistory);
          if (history.length > 0) {
            setChatHistory(history);
            setActiveChatId(history[0].id);
          } else { handleNewChat(); }
        } else { handleNewChat(); }
      } catch (error) { console.error("Failed to load chat history", error); handleNewChat(); }
    }
  }, []); // Note: Empty dependency array means this runs only once on mount

  // (useEffect for auto-scroll is the same)
  
  const activeChat = chatHistory.find(chat => chat.id === activeChatId);
  
  // (updateChatHistory is the same)
  
  const handleNewChat = (setActive = true) => {
    const newChat: ChatSession = { id: `chat-${Date.now()}`, title: "New Chat", messages: [], provider: 'gemini', followUps: [] };
    const updatedHistory = [newChat, ...chatHistory];
    updateChatHistory(updatedHistory);
    if (setActive) {
      setActiveChatId(newChat.id);
    }
    return newChat; // Return the new chat object
  };
  
  // --- NEW: GENERIC MESSAGE HANDLER for both chips and text input ---
  const sendMessage = async (query: string, chatId: string | null) => {
    if (isLoading || !chatId) return;
    const chatToUpdate = chatHistory.find(c => c.id === chatId);
    if (!chatToUpdate) return;

    setInputValue(""); // Clear input field
    const newUserMessage: Message = { role: 'user', content: query };
    const updatedMessages = [...chatToUpdate.messages, newUserMessage];
    
    const intermediateHistory = chatHistory.map(chat =>
      chat.id === chatId ? { ...chat, messages: updatedMessages, followUps: [] } : chat
    );
    updateChatHistory(intermediateHistory);
    setActiveChatId(chatId); // Ensure the chat is active
    setIsLoading(true);

    // (The fetch logic inside is the same as your previous handleChipClick)
    // ... fetch call to /api/explore ...
    // ... update finalHistory ...
    setIsLoading(false);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      sendMessage(inputValue.trim(), activeChatId);
    }
  };

  // (The rest of the component remains largely the same, but the footer is updated)
  // ...
  return (
    // ... (Sidebar and Header are the same)
    
        // ... (Main chat area is the same)

        <footer className="p-4 bg-white/80 backdrop-blur-sm border-t">
          <div className="w-full max-w-3xl mx-auto">
            {/* Follow-up Chips */}
            <div className="flex flex-wrap gap-3 justify-center mb-4">
              {activeChat?.followUps?.map((prompt, index) => (
                <button key={index} onClick={() => sendMessage(prompt, activeChatId)} disabled={isLoading} 
                  className="group flex items-center px-4 py-2 bg-white text-blue-600 border border-blue-200 rounded-full text-sm font-medium hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {prompt}
                  <ArrowRight className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>

            {/* NEW: Text Input Form */}
            <form onSubmit={handleFormSubmit} className="flex items-center space-x-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask anything or enter your location..."
                disabled={isLoading}
                className="w-full px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </footer>
    // ...
  );
}
