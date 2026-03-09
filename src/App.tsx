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
  Settings,
  X,
  FileWarning
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
  const [isLocationEnabled, setIsLocationEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'alerts' | 'explore' | 'history' | 'settings'>('chat');
  const [showScamModal, setShowScamModal] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isLocationEnabled) {
      requestLocation();
    } else {
      stopLocationTracking();
    }
    return () => stopLocationTracking();
  }, [isLocationEnabled]);

  const stopLocationTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setLocation({ coords: null });
  };

  const requestLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocation({ coords: null, error: "Geolocation not supported by your browser." });
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

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
        let errorMsg = "An unknown error occurred.";
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMsg = "Location access denied. Please enable location permissions in your browser settings.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg = "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMsg = "The request to get user location timed out.";
            break;
        }
        setLocation({ coords: null, error: errorMsg });
      },
      options
    );

    // Also start watching position for updates
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }
        });
      },
      (error) => {
        console.warn("WatchPosition Error:", error);
      },
      options
    );

    watchIdRef.current = watchId;
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
      console.error("Chat Error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I encountered an error while processing your request. Please check your connection or API quota and try again.",
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
          <NavIcon icon={<AlertTriangle className="w-6 h-6" />} active={activeTab === 'alerts'} onClick={() => setActiveTab('alerts')} />
          <NavIcon icon={<MapIcon className="w-6 h-6" />} active={activeTab === 'explore'} onClick={() => setActiveTab('explore')} />
          <div className="mt-auto flex flex-col gap-8">
            <NavIcon icon={<History className="w-6 h-6" />} active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
            <NavIcon icon={<Settings className="w-6 h-6" />} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
          </div>
        </nav>

        {/* Dynamic Content Area */}
        <div className="flex-1 flex flex-col relative">
          {activeTab === 'chat' && (
            <>
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
              </div>
            </>
          )}

          {activeTab === 'alerts' && (
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-900">Safety Alerts & Scams</h2>
                <button 
                  onClick={() => setShowScamModal(true)}
                  className="bg-amber-100 hover:bg-amber-200 text-amber-700 px-4 py-2 rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
                >
                  <FileWarning className="w-4 h-4" />
                  Report Scam
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AlertCard 
                  title="Broken Taxi Meter" 
                  type="scam" 
                  severity="medium"
                  description="Common in tourist hubs. Drivers claim the meter is broken to overcharge. Always agree on a price first or use verified apps."
                />
                <AlertCard 
                  title="Pickpocket Hotspot" 
                  type="hazard" 
                  severity="high"
                  description="High activity reported near central transit stations. Keep valuables in front pockets or anti-theft bags."
                />
                <AlertCard 
                  title="Fake Tour Guides" 
                  type="scam" 
                  severity="low"
                  description="Individuals offering 'exclusive' access to landmarks. Only book through official kiosks or verified websites."
                />
              </div>
            </div>
          )}

          {activeTab === 'explore' && (
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              <h2 className="text-2xl font-bold text-slate-900">Safe Exploration</h2>
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <MapIcon className="w-6 h-6 text-indigo-600" />
                  <h3 className="text-lg font-bold">Verified Safe Landmarks</h3>
                </div>
                <div className="space-y-4">
                  <LandmarkItem name="Central Historic District" safety="High" distance="1.2 km" />
                  <LandmarkItem name="Riverside Walkway" safety="Medium" distance="2.5 km" />
                  <LandmarkItem name="Museum Quarter" safety="High" distance="0.8 km" />
                </div>
                <button 
                  onClick={() => handleSendWithText("Show me safe landmarks near me")}
                  className="mt-6 w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all"
                >
                  Scan Nearby Landmarks
                </button>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              <h2 className="text-2xl font-bold text-slate-900">Recent Activity</h2>
              <div className="space-y-4">
                {messages.filter(m => m.role === 'user').map((m, i) => (
                  <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <History className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-700 truncate max-w-xs">{m.content}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">{new Date(m.timestamp).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              <h2 className="text-2xl font-bold text-slate-900">Safety Settings</h2>
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Live Location Tracking</h4>
                    <p className="text-xs text-slate-500">Allow ShieldGuide to monitor your position in real-time.</p>
                  </div>
                  <button 
                    onClick={() => setIsLocationEnabled(!isLocationEnabled)}
                    className={`w-12 h-6 rounded-full transition-all relative ${isLocationEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isLocationEnabled ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
                <div className="h-px bg-slate-100" />
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Emergency SOS Pulse</h4>
                    <p className="text-xs text-slate-500">Enable visual pulse on SOS button for visibility.</p>
                  </div>
                  <button className="w-12 h-6 rounded-full bg-indigo-600 relative">
                    <div className="absolute top-1 left-7 w-4 h-4 bg-white rounded-full" />
                  </button>
                </div>
              </div>
            </div>
          )}
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
                  onClick={() => { setActiveTab('chat'); handleSendWithText("What are the local emergency numbers here?"); }}
                />
                <SafetyAction 
                  icon={<Navigation className="w-4 h-4" />} 
                  label="Nearest Police" 
                  onClick={() => { setActiveTab('chat'); handleSendWithText("Where is the nearest police station?"); }}
                />
                <SafetyAction 
                  icon={<AlertTriangle className="w-4 h-4" />} 
                  label="Scam Alerts" 
                  onClick={() => setActiveTab('alerts')}
                />
                <SafetyAction 
                  icon={<MapIcon className="w-4 h-4 text-emerald-600" />} 
                  label="Safe Exploration" 
                  onClick={() => setActiveTab('explore')}
                />
                <SafetyAction 
                  icon={<FileWarning className="w-4 h-4 text-amber-600" />} 
                  label="Report Scam" 
                  onClick={() => setShowScamModal(true)}
                />
                <SafetyAction 
                  icon={<Info className="w-4 h-4" />} 
                  label="Local Etiquette" 
                  onClick={() => { setActiveTab('chat'); handleSendWithText("What is the local etiquette I should know?"); }}
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 relative overflow-hidden">
              {location.coords && (
                <div className="absolute top-0 right-0 p-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                </div>
              )}
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-indigo-600" />
                <h4 className="text-sm font-bold text-indigo-900">Live Safety Status</h4>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-indigo-700 leading-relaxed">
                  {!isLocationEnabled 
                    ? "Location tracking is currently disabled. Enable it for real-time risk monitoring."
                    : location.coords 
                      ? "Your live location is being monitored. ShieldGuide is scanning for nearby risks in real-time."
                      : location.error 
                        ? `Location Error: ${location.error}`
                        : "Establishing secure location link..."}
                </p>
                
                {location.coords && (
                  <div className="bg-white/50 rounded-lg p-2 border border-indigo-100 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-indigo-400 uppercase">Coordinates</span>
                      <span className="text-[10px] font-mono text-indigo-900">
                        {location.coords.latitude.toFixed(4)}°, {location.coords.longitude.toFixed(4)}°
                      </span>
                    </div>
                    <a 
                      href={`https://www.google.com/maps?q=${location.coords.latitude},${location.coords.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                      title="View on Google Maps"
                    >
                      <MapIcon className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              <button 
                onClick={() => setIsLocationEnabled(!isLocationEnabled)}
                className={`mt-3 w-full text-xs font-bold flex items-center justify-center gap-1 px-3 py-2 rounded-lg border shadow-sm transition-all active:scale-95 ${
                  isLocationEnabled 
                    ? 'bg-white text-red-600 border-red-100 hover:bg-red-50' 
                    : 'bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-700'
                }`}
              >
                {isLocationEnabled ? "Disable Location" : "Enable Live Location"}
              </button>
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

      {/* Scam Report Modal */}
      <AnimatePresence>
        {showScamModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-amber-50">
                <div className="flex items-center gap-2 text-amber-700">
                  <FileWarning className="w-5 h-5" />
                  <h3 className="font-bold text-lg">Report a Scam</h3>
                </div>
                <button onClick={() => setShowScamModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
                <p className="text-sm text-slate-600 mb-4">Select the issue you're currently facing for immediate guidance:</p>
                {[
                  "Extra money charges for the particular destination places",
                  "Taking through long route to increase the travel time",
                  "Overcharging & Hidden Fees",
                  "Transport Scams",
                  "Tourist Traps",
                  "Broken taxi meter or refusing to use it",
                  "Fake tickets, tours, or guides",
                  "Unreasonable pressure to buy items",
                  "Other real-time problem"
                ].map((scam, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setShowScamModal(false);
                      setActiveTab('chat');
                      if (scam === "Other real-time problem") {
                        handleSendWithText("I want to report a scam. ");
                      } else {
                        handleSendWithText(`I want to report a real-time problem: ${scam}. What should I do right now?`);
                      }
                    }}
                    className="w-full text-left p-3 rounded-xl border border-slate-100 hover:border-amber-300 hover:bg-amber-50 transition-all text-sm font-medium text-slate-700 mb-2 last:mb-0"
                  >
                    {scam}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  // Use an effect to auto-send when a specific state changes
  const [pendingAutoSend, setPendingAutoSend] = useState(false);

  useEffect(() => {
    if (pendingAutoSend && input) {
      handleSend();
      setPendingAutoSend(false);
    }
  }, [input, pendingAutoSend]);

  function handleSendWithText(text: string) {
    setActiveTab('chat');
    setInput(text);
    setPendingAutoSend(true);
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

function AlertCard({ title, type, severity, description }: { title: string, type: string, severity: 'low' | 'medium' | 'high', description: string }) {
  const severityColors = {
    low: 'bg-blue-100 text-blue-700 border-blue-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    high: 'bg-red-100 text-red-700 border-red-200'
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {type === 'scam' ? <AlertTriangle className="w-4 h-4 text-amber-500" /> : <ShieldAlert className="w-4 h-4 text-red-500" />}
          <h3 className="font-bold text-slate-900">{title}</h3>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border ${severityColors[severity]}`}>
          {severity}
        </span>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
}

function LandmarkItem({ name, safety, distance }: { name: string, safety: string, distance: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
          <MapPin className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-900">{name}</h4>
          <p className="text-[10px] text-slate-500">{distance} away</p>
        </div>
      </div>
      <div className="text-right">
        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Safety: {safety}</span>
      </div>
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
