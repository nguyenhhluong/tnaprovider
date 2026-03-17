import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';

// Initialize Gemini API
// Note: In a real production app, this should be handled server-side to protect the API key.
// For this demo, we use the environment variable.
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || "dummy-key" });

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export function AIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'model',
      text: 'Hi! I am Heidi TNA, your AI assistant. I can help you get a quotation for your project or book an appointment with our team. How can I help you today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Create a chat session ref to maintain history
  const chatSessionRef = useRef<any>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const initChat = () => {
    if (!chatSessionRef.current) {
      try {
        const bookAppointmentFunc: FunctionDeclaration = {
          name: "bookAppointment",
          description: "Book an appointment for a consultation.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING, description: "The preferred date (e.g., '2023-10-25')" },
              time: { type: Type.STRING, description: "The preferred time (e.g., '10:00 AM')" },
              name: { type: Type.STRING, description: "The user's name" },
              phone: { type: Type.STRING, description: "The user's phone number" }
            },
            required: ["date", "time", "name", "phone"]
          }
        };

        const getQuotationFunc: FunctionDeclaration = {
          name: "getQuotation",
          description: "Generate a rough quotation estimate based on project details.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              projectType: { type: Type.STRING, description: "Type of project (e.g., 'joinery', 'shopfitting', 'construction')" },
              scope: { type: Type.STRING, description: "Brief description of the scope" },
              budget: { type: Type.STRING, description: "The user's budget" }
            },
            required: ["projectType", "scope", "budget"]
          }
        };

        chatSessionRef.current = ai.chats.create({
          model: "gemini-3-flash-preview",
          config: {
            systemInstruction: `You are Heidi TNA, an AI assistant for TNA Provider (a commercial construction, shopfitting, and joinery company in Australia). 
Your primary capabilities are:
1. Providing quotations: Ask the user for their project type, scope, and budget. Once provided, use the getQuotation tool to generate an estimate.
2. Booking appointments: Ask the user for their preferred date, time, name, and phone number. Once provided, use the bookAppointment tool to confirm the booking.

Be professional, helpful, and concise. Do not use markdown formatting like bolding or lists unless necessary for readability. Keep responses relatively short.`,
            tools: [{ functionDeclarations: [bookAppointmentFunc, getQuotationFunc] }]
          }
        });
      } catch (error) {
        console.error("Failed to initialize chat:", error);
      }
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: text
    };
    
    setMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);

    try {
      initChat();
      
      if (chatSessionRef.current) {
        const response = await chatSessionRef.current.sendMessage({ message: text });
        
        let responseText = response.text || "";
        
        // Handle function calls if any
        if (response.functionCalls && response.functionCalls.length > 0) {
          const call = response.functionCalls[0];
          if (call.name === "bookAppointment") {
            const args = call.args as any;
            responseText = `I have successfully booked your appointment for ${args.date} at ${args.time}. Our team will contact you at ${args.phone} to confirm. We look forward to speaking with you, ${args.name}!`;
          } else if (call.name === "getQuotation") {
            const args = call.args as any;
            // Generate a dummy estimate based on project type
            let estimate = "$10,000 - $25,000";
            if (args.projectType.toLowerCase().includes("construction")) estimate = "$50,000 - $150,000+";
            if (args.projectType.toLowerCase().includes("shopfitting")) estimate = "$20,000 - $80,000";
            
            responseText = `Based on your details for a ${args.projectType} project, a rough estimate would be in the range of ${estimate}. Please note this is a preliminary estimate. A senior estimator will review your scope ("${args.scope}") and budget ("${args.budget}") and follow up with a precise quote.`;
          }
        } else if (!responseText) {
          responseText = "I'm sorry, I couldn't process that request.";
        }
        
        const newModelMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: responseText
        };
        
        setMessages(prev => [...prev, newModelMsg]);
      } else {
        throw new Error("Chat session not initialized");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "I'm currently experiencing technical difficulties. Please try contacting us via the Contact page."
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const userText = input.trim();
    setInput('');
    await sendMessage(userText);
  };

  const handleQuickAction = (text: string) => {
    sendMessage(text);
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 w-14 h-14 bg-brand-accent text-white rounded-full shadow-xl flex items-center justify-center hover:bg-brand-accent-hover transition-colors z-50"
            aria-label="Open AI Chat"
          >
            <MessageSquare className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 w-[350px] sm:w-[400px] h-[500px] max-h-[80vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-brand-darker text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-brand-accent rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm">Heidi TNA</h3>
                  <p className="text-[10px] text-gray-300">Online</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors p-1"
                aria-label="Close chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-gray-50 dark:bg-gray-900/50">
              {messages.map((msg, index) => (
                <div key={msg.id} className="flex flex-col gap-2">
                  <div 
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                        msg.role === 'user' 
                          ? 'bg-brand-accent text-white rounded-tr-sm' 
                          : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700 rounded-tl-sm shadow-sm'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                  
                  {/* Quick Actions */}
                  {index === 0 && messages.length === 1 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      <button 
                        onClick={() => handleQuickAction("I would like to get a quotation for a project.")}
                        className="text-xs bg-white dark:bg-gray-800 border border-brand-accent text-brand-accent hover:bg-brand-accent hover:text-white transition-colors px-3 py-1.5 rounded-full shadow-sm"
                      >
                        Get a Quotation
                      </button>
                      <button 
                        onClick={() => handleQuickAction("I would like to book an appointment.")}
                        className="text-xs bg-white dark:bg-gray-800 border border-brand-accent text-brand-accent hover:bg-brand-accent hover:text-white transition-colors px-3 py-1.5 rounded-full shadow-sm"
                      >
                        Book an Appointment
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-brand-accent" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">Heidi TNA is typing...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
              <form onSubmit={handleSend} className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 h-10 px-4 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-brand-dark dark:text-white focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-colors"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="w-10 h-10 rounded-full bg-brand-accent text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-accent-hover transition-colors flex-shrink-0"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </form>
            </div>
            
            {/* Footer Branding */}
            <div className="bg-gray-100 dark:bg-gray-950 py-1.5 text-center border-t border-gray-200 dark:border-gray-800">
              <p className="text-[9px] text-gray-500 dark:text-gray-500 font-medium">
                AI copyright and provided by <a href="https://heidiai.com.au" target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:underline">Heidiai.com.au</a>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
