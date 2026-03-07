/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  Navigation, 
  MapPin, 
  Phone, 
  Info, 
  Send, 
  Loader2, 
  ChevronRight,
  ShieldAlert,
  Map as MapIcon,
  Heart,
  History,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { chatWithShieldGuide } from './services/gemini';
import { Message, LocationState } from './types';

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Welcome to **ShieldGuide**. I am your elite safety assistant. Please share your location for the most accurate risk assessment and emergency navigation.",
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState<LocationState>({ coords: null });
  const [activeTab, setActiveTab] = useState<'chat' | 'safety' | 'explore'>('chat');
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    requestLocation();
  }, []);

  const requestLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            coords: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            }
          });
        },
        (error) => {
          setLocation({ coords: null, error: error.message });
        }
      );
    } else {
      setLocation({ coords: null, error: "Geolocation not supported" });
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatWithShieldGuide(input, messages, location.coords);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text,
        timestamp: Date.now(),
        groundingMetadata: response.groundingMetadata
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I encountered an error while processing your request. Please check your connection and try again.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerSOS = () => {
    const sosMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: "I feel unsafe. Emergency protocols triggered.",
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, sosMessage]);
    // In a real app, this would call local emergency services
    handleEmergencyResponse();
  };

  const handleEmergencyResponse = async () => {
    setIsLoading(true);
    try {
      const response = await chatWithShieldGuide("I FEEL UNSAFE. IMMEDIATELY PROVIDE EMERGENCY NUMBERS AND NEAREST POLICE STATION.", messages, location.coords);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text,
        timestamp: Date.now(),
        groundingMetadata: response.groundingMetadata
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      {/* Header */}
      <header className="glass-panel px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-200">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">ShieldGuide</h1>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${location.coords ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                {location.coords ? 'Location Active' : 'Location Required'}
              </span>
            </div>
          </div>
        </div>
        
        <button 
          onClick={triggerSOS}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full font-bold text-sm shadow-lg shadow-red-200 transition-all active:scale-95 emergency-pulse flex items-center gap-2"
        >
          <ShieldAlert className="w-4 h-4" />
          SOS
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar (Desktop) */}
        <nav className="hidden md:flex flex-col w-20 bg-white border-r border-slate-200 py-8 items-center gap-8">
          <NavIcon icon={<Shield className="w-6 h-6" />} active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
          <NavIcon icon={<AlertTriangle className="w-6 h-6" />} active={activeTab === 'safety'} onClick={() => setActiveTab('safety')} />
          <NavIcon icon={<MapIcon className="w-6 h-6" />} active={activeTab === 'explore'} onClick={() => setActiveTab('explore')} />
          <div className="mt-auto flex flex-col gap-8">
            <NavIcon icon={<History className="w-6 h-6" />} active={false} onClick={() => {}} />
            <NavIcon icon={<Settings className="w-6 h-6" />} active={false} onClick={() => {}} />
          </div>
        </nav>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col relative">
          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-4 shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-white border border-slate-200 text-slate-800'
                  }`}>
                    <div className="prose prose-slate prose-sm max-w-none">
                      <div dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }} />
                    </div>
                    
                    {msg.groundingMetadata?.groundingChunks && (
                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Verified Locations</p>
                        {msg.groundingMetadata.groundingChunks.map((chunk: any, idx: number) => (
                          chunk.maps && (
                            <a 
                              key={idx}
                              href={chunk.maps.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors group"
                            >
                              <MapPin className="w-4 h-4 text-indigo-500" />
                              <span className="text-xs font-medium text-slate-700 group-hover:text-indigo-600 truncate">
                                {chunk.maps.title || 'View on Maps'}
                              </span>
                              <ChevronRight className="w-3 h-3 ml-auto text-slate-400" />
                            </a>
                          )
                        ))}
                      </div>
                    )}
                    
                    <div className={`text-[10px] mt-2 opacity-50 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  <span className="text-sm text-slate-500 italic">ShieldGuide is assessing risks...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 md:p-6 bg-white border-t border-slate-200">
            <div className="max-w-4xl mx-auto flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about local scams, safe routes, or landmarks..."
                className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white p-3 rounded-xl transition-all active:scale-95"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[10px] text-center mt-3 text-slate-400 uppercase tracking-widest font-medium">
              ShieldGuide: Proactive Safety Intelligence
            </p>
          </div>
        </div>

        {/* Right Panel (Desktop) */}
        <aside className="hidden lg:flex flex-col w-80 bg-white border-l border-slate-200 p-6 overflow-y-auto">
          <section className="space-y-6">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Quick Safety Actions</h3>
              <div className="grid grid-cols-1 gap-3">
                <SafetyAction 
                  icon={<Phone className="w-4 h-4" />} 
                  label="Local Emergency" 
                  onClick={() => handleSendWithText("What are the local emergency numbers here?")}
                />
                <SafetyAction 
                  icon={<Navigation className="w-4 h-4" />} 
                  label="Nearest Police" 
                  onClick={() => handleSendWithText("Where is the nearest police station?")}
                />
                <SafetyAction 
                  icon={<AlertTriangle className="w-4 h-4" />} 
                  label="Scam Alerts" 
                  onClick={() => handleSendWithText("What are common scams in this area?")}
                />
                <SafetyAction 
                  icon={<Info className="w-4 h-4" />} 
                  label="Local Etiquette" 
                  onClick={() => handleSendWithText("What is the local etiquette I should know?")}
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-indigo-600" />
                <h4 className="text-sm font-bold text-indigo-900">Safety Status</h4>
              </div>
              <p className="text-xs text-indigo-700 leading-relaxed">
                {location.coords 
                  ? "Your GPS is active. ShieldGuide is monitoring your vicinity for known risk zones."
                  : "Location access is disabled. Please enable GPS for real-time risk detection."}
              </p>
              {!location.coords && (
                <button 
                  onClick={requestLocation}
                  className="mt-3 text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  Enable Location <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Recent Safety Tips</h3>
              <div className="space-y-3">
                <TipCard 
                  title="Night Travel" 
                  content="Always prefer well-lit, populated routes. Avoid shortcuts through parks after dark."
                />
                <TipCard 
                  title="Taxi Safety" 
                  content="Ensure the meter is running or agree on a price before starting the journey."
                />
              </div>
            </div>
          </section>
        </aside>
      </main>
    </div>
  );

  function handleSendWithText(text: string) {
    setInput(text);
    // Use a timeout to ensure state updates before sending
    setTimeout(() => {
      const btn = document.querySelector('button[disabled="false"]') as HTMLButtonElement;
      if (btn) btn.click();
    }, 100);
  }
}

function NavIcon({ icon, active, onClick }: { icon: React.ReactNode, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`p-3 rounded-xl transition-all ${
        active 
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
          : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
      }`}
    >
      {icon}
    </button>
  );
}

function SafetyAction({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all group text-left"
    >
      <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-indigo-100 text-slate-500 group-hover:text-indigo-600 transition-colors">
        {icon}
      </div>
      <span className="text-xs font-semibold text-slate-700 group-hover:text-indigo-900">{label}</span>
    </button>
  );
}

function TipCard({ title, content }: { title: string, content: string }) {
  return (
    <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
      <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">{title}</h4>
      <p className="text-xs text-slate-600 leading-snug">{content}</p>
    </div>
  );
}

function formatContent(content: string) {
  // Simple markdown-like formatting for bolding
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br />')
    .replace(/^- (.*)/gm, '• $1');
}
