import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { dbService } from '@/services/dbService';
import { Profile as ProfileType } from '@/types';
import { ChatMessage } from '../../chatServer';
import { 
  MessageSquare, Send, Mic, Paperclip, Smile, Search, 
  MoreVertical, Check, CheckCheck, Trash2, CornerUpLeft, 
  Users, Trophy, Target, ShieldQuestion, HelpCircle, 
  ArrowLeft, CircleDot, Phone, Video, RefreshCw, Play, Pause
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';

const CHANNELS = [
  { id: 'general', name: 'Chat General', icon: MessageSquare, desc: 'Discusión general del mundial' },
  { id: 'bets', name: 'PRODE & Apuestas', icon: Trophy, desc: 'Reclamos, apuestas y cargadas' },
  { id: 'scores', name: 'Resultados & Goles', icon: Target, desc: 'Seguimiento en directo' },
  { id: 'support', name: 'Soporte & Ayuda', icon: HelpCircle, desc: 'Atención al cliente del PRODE' },
];

const POPULAR_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '⚽', '🏆'];

export default function Chat() {
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [user, setUser] = useState<any>(null);
  const [activeChannel, setActiveChannel] = useState('general');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  
  // States of WebSocket connection
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Focus and reply states
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showChannelListMobile, setShowChannelListMobile] = useState(true);

  // Voice note and player simulator states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [playingAudioIds, setPlayingAudioIds] = useState<Record<string, boolean>>({});

  // References for scrolling and typing timeouts
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingSentRef = useRef<boolean>(false);

  useEffect(() => {
    // 1. Get current authenticated user
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        dbService.getProfile(session.user.id).then((p) => {
          setProfile(p);
        });
      }
    });
  }, []);

  // Sync / Connect to WebSocket of matching environment
  useEffect(() => {
    if (!profile) return;

    connectWebSocket();

    return () => {
      disconnectWebSocket();
    };
  }, [profile, activeChannel]);

  // Handle auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const connectWebSocket = () => {
    if (socketRef.current) {
      socketRef.current.close();
    }

    const isSecure = window.location.protocol === 'https:';
    const wsProtocol = isSecure ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/api/chat`;

    console.log('[CHAT DEBUG] Connecting WS to:', wsUrl);
    setIsReconnecting(true);

    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      setIsReconnecting(false);
      console.log('[CHAT DEBUG] WS Connected successfully');

      // Join the room
      const joinPayload = {
        type: 'join',
        payload: {
          userId: profile!.id,
          userName: profile!.full_name || profile!.username || 'Usuario',
          userAvatar: profile!.avatar_url || '',
          userPoints: profile!.points || 0,
          channel: activeChannel,
        }
      };
      socket.send(JSON.stringify(joinPayload));
    };

    socket.onmessage = (event) => {
      try {
        const { type, payload } = JSON.parse(event.data);

        switch (type) {
          case 'init': {
            if (payload.channel === activeChannel) {
              setMessages(payload.history);
            }
            break;
          }
          case 'message': {
            if (payload.channel === activeChannel) {
              setMessages((prev) => {
                // Ensure duplicate protection
                if (prev.some((m) => m.id === payload.id)) return prev;
                return [...prev, payload];
              });
            }
            break;
          }
          case 'presence': {
            if (payload.channel === activeChannel) {
              setOnlineUsers(payload.users);
              // Extract list of users other than current user who are typing
              const typers = payload.users
                .filter((u: any) => u.typing && u.userId !== profile!.id)
                .map((u: any) => u.userName);
              setTypingUsers(typers);
            }
            break;
          }
          case 'reaction_update': {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === payload.messageId
                  ? { ...m, reactions: payload.reactions }
                  : m
              )
            );
            break;
          }
          case 'message_deleted': {
            setMessages((prev) => prev.filter((m) => m.id !== payload.messageId));
            break;
          }
          case 'error': {
            toast.error(payload.message);
            break;
          }
          default:
            break;
        }
      } catch (err) {
        console.error('[CHAT DEBUG] Error processing incoming WS event:', err);
      }
    };

    socket.onclose = (event) => {
      setIsConnected(false);
      setIsReconnecting(false);
      console.log('[CHAT DEBUG] WS Connection closed:', event.reason);
      
      // Auto-reconnect after 3 seconds if not intentionally closed
      if (socketRef.current === socket) {
        setTimeout(() => {
          console.log('[CHAT DEBUG] Attempting to reconnect...');
          connectWebSocket();
        }, 3000);
      }
    };

    socket.onerror = (err) => {
      console.error('[CHAT DEBUG] WS Connection error:', err);
      setIsConnected(false);
    };
  };

  const disconnectWebSocket = () => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setIsConnected(false);
  };

  // Voice note timer effect
  useEffect(() => {
    let interval: any;
    if (isRecording) {
      setRecordingSeconds(0);
      interval = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  const formatRecordingTime = (totalSeconds: number) => {
    const min = Math.floor(totalSeconds / 60);
    const sec = totalSeconds % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const handleSendVoiceNote = () => {
    if (!isConnected || !socketRef.current || recordingSeconds < 1) {
      setIsRecording(false);
      return;
    }
    const durationStr = formatRecordingTime(recordingSeconds);
    const voiceText = `🎙️ Nota de voz (${durationStr})`;

    const payload = {
      type: 'message',
      payload: {
        text: voiceText,
        repliedTo: replyingTo ? {
          id: replyingTo.id,
          userName: replyingTo.userName,
          text: replyingTo.text,
        } : null
      }
    };

    socketRef.current.send(JSON.stringify(payload));
    setIsRecording(false);
    setReplyingTo(null);

    // Cancel typing
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (lastTypingSentRef.current) {
      socketRef.current.send(JSON.stringify({
        type: 'typing',
        payload: { typing: false }
      }));
      lastTypingSentRef.current = false;
    }
  };

  const togglePlayAudio = (id: string) => {
    setPlayingAudioIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Typing status management
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    if (!isConnected || !socketRef.current) return;

    // Send typing status of 'true'
    if (!lastTypingSentRef.current) {
      socketRef.current.send(JSON.stringify({
        type: 'typing',
        payload: { typing: true }
      }));
      lastTypingSentRef.current = true;
    }

    // Reset indicator timeout on change
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (socketRef.current && lastTypingSentRef.current) {
        socketRef.current.send(JSON.stringify({
          type: 'typing',
          payload: { typing: false }
        }));
        lastTypingSentRef.current = false;
      }
    }, 2500);
  };

  // Action: Send Message
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !isConnected || !socketRef.current) return;

    const payload = {
      type: 'message',
      payload: {
        text: inputText,
        repliedTo: replyingTo ? {
          id: replyingTo.id,
          userName: replyingTo.userName,
          text: replyingTo.text,
        } : null
      }
    };

    socketRef.current.send(JSON.stringify(payload));
    
    // Reset inputs
    setInputText('');
    setReplyingTo(null);

    // Cancel typing states
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (lastTypingSentRef.current) {
      socketRef.current.send(JSON.stringify({
        type: 'typing',
        payload: { typing: false }
      }));
      lastTypingSentRef.current = false;
    }
  };

  // Action: Quick reaction selection
  const handleReaction = (messageId: string, emoji: string) => {
    if (!isConnected || !socketRef.current) return;
    socketRef.current.send(JSON.stringify({
      type: 'reaction',
      payload: { messageId, emoji }
    }));
  };

  // Action: Delete Own Message
  const handleDeleteMessage = (messageId: string) => {
    if (!isConnected || !socketRef.current) return;
    socketRef.current.send(JSON.stringify({
      type: 'delete',
      payload: { messageId }
    }));
    toast.success('Mensaje eliminado');
  };

  const getChannelLastMessage = (channelId: string) => {
    // In actual implementation, we might get last messages from socket or cache.
    // For visual similarity list preview, we'll placeholder or filter from local backlog if loaded.
    if (activeChannel === channelId && messages.length > 0) {
      const last = messages[messages.length - 1];
      return { text: last.text, time: formatShortTime(last.timestamp) };
    }
    
    // Aesthetic fallbacks
    switch (channelId) {
      case 'general': return { text: '¡Bienvenidos al chat oficial del mundial!', time: '12:00' };
      case 'bets': return { text: '¿Quién tiene las mejores fijas para hoy?', time: 'Ayer' };
      case 'scores': return { text: 'Gooool de Argentina directo de penal...', time: 'Lun' };
      case 'support': return { text: 'Dinos tus dudas e incidencias técnicas aquí.', time: '10:45' };
      default: return { text: 'Sin mensajes', time: '' };
    }
  };

  const formatShortTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return '';
    }
  };

  // WhatsApp random user color assignment logic for bubbles
  const getUserColor = (userId: string) => {
    const colors = [
      'text-teal-400', 'text-amber-400', 'text-sky-450', 'text-emerald-400', 
      'text-orange-400', 'text-rose-450', 'text-indigo-400', 'text-pink-400', 'text-violet-400'
    ];
    let sum = 0;
    for (let i = 0; i < userId.length; i++) {
      sum += userId.charCodeAt(i);
    }
    return colors[sum % colors.length];
  };

  const getChannelColorClass = (id: string) => {
    switch (id) {
      case 'general': return 'bg-gradient-to-tr from-[#128c7e] to-[#25d366] text-zinc-950 shadow-md';
      case 'bets': return 'bg-gradient-to-tr from-amber-600 to-yellow-400 text-zinc-950 shadow-md';
      case 'scores': return 'bg-gradient-to-tr from-sky-600 to-emerald-400 text-zinc-950 shadow-md';
      case 'support': return 'bg-gradient-to-tr from-rose-600 to-orange-400 text-zinc-950 shadow-md';
      default: return 'bg-[#202c33] text-white';
    }
  };

  // Filter messages by search queries
  const filteredMessages = messages.filter((m) =>
    m.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.userName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-120px)] min-h-[500px] md:h-[750px] w-full max-w-6xl mx-auto rounded-2xl md:rounded-3xl overflow-hidden border border-zinc-805 bg-[#0b141a] shadow-[0_15px_45px_rgba(0,0,0,0.8)]">
      
      {/* 1. Left Sidebar: Channels & Status */}
      <div className={`w-full md:w-[360px] flex-shrink-0 flex flex-col border-r border-zinc-800/80 bg-[#111b21] transition-all duration-300 ${
        showChannelListMobile ? 'block' : 'hidden md:flex'
      }`}>
        
        {/* Sidebar Header */}
        <div className="sticky top-0 bg-[#202c33] p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-orange-500/10 shadow bg-zinc-900 flex items-center justify-center">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="You" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              ) : (
                <MessageSquare className="text-orange-500 size-5" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase italic tracking-tight leading-none">WhatsApp Mundial</h2>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                  {isConnected ? 'EN LÍNEA' : isReconnecting ? 'CONECTANDO...' : 'DESCONECTADO'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => connectWebSocket()} 
              disabled={isReconnecting}
              title="Forzar Reconexión" 
              className={`p-2 hover:bg-white/5 rounded-full text-zinc-400 hover:text-white transition-all ${isReconnecting ? 'animate-spin' : ''}`}
            >
              <RefreshCw size={16} />
            </button>
            <div className="text-[10px] bg-emerald-500/15 text-emerald-400 font-extrabold px-2 py-1 rounded-full uppercase tracking-widest border border-emerald-500/20">
              {profile?.points || 0} PTS
            </div>
          </div>
        </div>

        {/* Channels Search Box */}
        <div className="p-3 bg-[#111b21] border-b border-zinc-850">
          <div className="relative bg-[#202c33] rounded-xl flex items-center px-4 py-2 border border-zinc-800/20">
            <Search size={16} className="text-zinc-500 mr-2" />
            <input
              type="text"
              placeholder="Buscar en el chat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-white placeholder-zinc-500 w-full font-bold focus:ring-0"
            />
          </div>
        </div>

        {/* Channels / Chat Rooms List */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-850/40">
          <div className="px-3 py-2 text-[10px] font-black uppercase text-zinc-500 tracking-widest bg-zinc-900/10">
            Salas Oficiales de Conversación
          </div>
          {CHANNELS.map((ch) => {
            const lastMsg = getChannelLastMessage(ch.id);
            const isSelected = activeChannel === ch.id;
            const livePresenceCount = onlineUsers.length;
            
            return (
              <button
                key={ch.id}
                onClick={() => {
                  setActiveChannel(ch.id);
                  setShowChannelListMobile(false);
                }}
                className={`w-full text-left p-3.5 flex items-start gap-3.5 transition-all hover:bg-[#202c33]/40 ${
                  isSelected ? 'bg-[#2a3942]' : ''
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border border-zinc-900/40 transition-all ${getChannelColorClass(ch.id)}`}>
                  <ch.icon size={22} className="text-zinc-950 font-black shrink-0" strokeWidth={2.5} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="text-sm font-black text-white italic tracking-tight">{ch.name}</h3>
                    <span className="text-[10px] text-zinc-500 font-bold">{lastMsg.time}</span>
                  </div>
                  <p className="text-xs text-zinc-400 font-medium truncate mb-1">
                    {ch.desc}
                  </p>
                  
                  {/* Presence indicator under the chat item list */}
                  <div className="flex items-center gap-3">
                    <span className="text-[10.5px] text-zinc-500 italic block truncate flex-1 font-bold">
                       {lastMsg.text}
                    </span>
                    {isSelected && livePresenceCount > 0 && (
                      <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 text-[9px] font-black rounded uppercase tracking-wider">
                        <Users size={10} /> {livePresenceCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Right Canvas: Active Conversation Layout */}
      <div className={`flex-1 flex flex-col h-full bg-[#0b141a] relative ${
        showChannelListMobile ? 'hidden md:flex' : 'flex'
      }`}>
        
        {/* WhatsApp iconic doodle background pattern using SVG layers */}
        <div className="absolute inset-0 bg-[#0b141a] opacity-35" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23128c7e' fill-opacity='0.08' fill-rule='evenodd'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm1-61c3.105 0 5.5-2.395 5.5-5.5s-2.395-5.5-5.5-5.5-5.5 2.395-5.5 5.5 2.395 5.5 5.5 5.5zM45 4c3.105 0 5.5-2.395 5.5-5.5S48.105-7 45-7s-5.5 2.395-5.5 5.5S41.895 4 45 4zm-14 47c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm34-31c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z'/%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        {/* Chat Title Header Container */}
        <div className="sticky top-0 bg-[#202c33] p-3.5 flex items-center justify-between border-b border-zinc-800/30 z-10">
          <div className="flex items-center gap-3">
            {/* Back button for mobile view */}
            <button 
              onClick={() => setShowChannelListMobile(true)} 
              className="md:hidden p-1.5 hover:bg-white/5 rounded-full text-zinc-400 hover:text-white"
            >
              <ArrowLeft size={20} />
            </button>

            {/* Title Room Logo */}
            {(() => {
              const activeChObj = CHANNELS.find((ch) => ch.id === activeChannel);
              const ActiveIcon = activeChObj?.icon || MessageSquare;
              return (
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border border-zinc-900/40 shrink-0 ${getChannelColorClass(activeChannel)}`}>
                  <ActiveIcon size={18} className="text-zinc-950 font-black" strokeWidth={2.5} />
                </div>
              );
            })()}

            <div>
              <h1 className="text-sm font-black text-white italic tracking-tight">
                {CHANNELS.find((ch) => ch.id === activeChannel)?.name || 'Canal'}
              </h1>
              {/* Online sub-indicators and typing indicator */}
              {typingUsers.length > 0 ? (
                <p className="text-[11px] text-emerald-450 font-black italic tracking-tight animate-pulse truncate max-w-[200px] md:max-w-xs">
                  {typingUsers.join(', ')} {typingUsers.length > 1 ? 'están escribiendo...' : 'está escribiendo...'}
                </p>
              ) : (
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  {onlineUsers.length > 0 
                    ? `${onlineUsers.length} miembro${onlineUsers.length > 1 ? 's' : ''} activo${onlineUsers.length > 1 ? 's' : ''}` 
                    : 'Uniendo al chat...'}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 text-zinc-400">
            <button className="p-2 hover:bg-white/5 rounded-full hover:text-white transition-all hidden sm:block">
              <Phone size={16} />
            </button>
            <button className="p-2 hover:bg-white/5 rounded-full hover:text-white transition-all hidden sm:block">
              <Video size={16} />
            </button>
            <div className="w-[1px] h-4 bg-zinc-700 hidden sm:block" />
            <button className="p-2 hover:bg-white/5 rounded-full hover:text-white transition-all">
              <MoreVertical size={16} />
            </button>
          </div>
        </div>

        {/* Message Stream Window */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 z-10">
          
          {/* WhatsApp style yellow/gold Security Info pill at top of scroll */}
          <div className="flex justify-center mb-3">
            <div className="bg-[#182229] border border-zinc-800/40 text-[#ffd279] text-[11px] font-medium px-4 py-2 rounded-xl text-center max-w-sm shadow-sm flex items-start gap-2 w-fit leading-relaxed select-none">
              <span className="text-xs shrink-0 select-none">🔒</span>
              <span className="text-left font-bold text-zinc-300">Los mensajes de este canal están respaldados por el servidor de apuestas del PRODE. Nadie fuera de este chat puede verlos.</span>
            </div>
          </div>

          <div className="flex justify-center mb-1">
            <span className="bg-[#182229] text-zinc-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg shadow-sm border border-zinc-805/40">
              HOY
            </span>
          </div>
          
          {/* Welcome Message Cards */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-4">
              <div className="w-16 h-16 bg-[#128c7e]/10 text-emerald-400 rounded-full flex items-center justify-center border border-emerald-500/20 shadow-xl mb-2 animate-bounce">
                <MessageSquare size={30} />
              </div>
              <h3 className="text-base font-black text-white uppercase italic tracking-tight">Inicio del Chat Seguro</h3>
              <p className="text-xs text-zinc-400 font-bold max-w-sm uppercase italic tracking-widest leading-relaxed">
                Mensajes protegidos localmente. ¡Sé el primero en enviar un comentario en <span className="text-orange-500">#{activeChannel}</span> y activa el PRODE!
              </p>
            </div>
          )}

          {/* Render individual chats with proper bubble styling */}
          <div className="space-y-3.5">
            {filteredMessages.map((msg, index) => {
              const isMe = msg.userId === profile?.id;
              const hasReactions = msg.reactions && Object.keys(msg.reactions).length > 0;
              const isConsecutive = index > 0 && messages[index - 1].userId === msg.userId;

              return (
                <div 
                  key={msg.id} 
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'} group items-end gap-1.5`}
                >
                  {/* Other User Avatar */}
                  {!isMe && !isConsecutive && (
                    <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden shrink-0 shadow flex items-center justify-center">
                      {msg.userAvatar ? (
                        <img src={msg.userAvatar} alt={msg.userName} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-black italic">{msg.userName.substring(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                  )}
                  
                  {/* Keep padding same when thumbnail is hidden for consecutive items */}
                  {!isMe && isConsecutive && <div className="w-8 shrink-0" />}

                  {/* Bubble Container */}
                  <div className="max-w-[85%] md:max-w-[70%] relative flex flex-col group">
                    
                    {/* Quotation / Reply Box Indicator inside original Bubble */}
                    {msg.repliedTo && (
                      <div className="bg-[#0b141a]/40 border-l-4 border-orange-500 p-2 rounded-t-xl mb-0.5 text-xs">
                        <p className="font-extrabold text-[10px] text-orange-400 uppercase tracking-widest mb-0.5">
                          {msg.repliedTo.userName}
                        </p>
                        <p className="text-zinc-300 italic line-clamp-1">{msg.repliedTo.text}</p>
                      </div>
                    )}

                    <div className={`p-3 relative rounded-2xl shadow-md ${
                      isMe 
                        ? 'bg-[#005c4b] text-white rounded-tr-none' 
                        : 'bg-[#202c33] text-zinc-100 rounded-tl-none'
                    }`}>
                      
                      {/* Name Header and points and metadata */}
                      {!isMe && !isConsecutive && (
                        <div className="flex items-center gap-2 mb-1 justify-between">
                          <span className={`text-xs font-black italic tracking-wide ${getUserColor(msg.userId)}`}>
                            {msg.userName}
                          </span>
                          <span className="text-[9px] font-black bg-white/5 text-zinc-400 px-1.5 py-0.5 rounded border border-white/5 whitespace-nowrap">
                            🛡️ {msg.userPoints} PTS
                          </span>
                        </div>
                      )}

                      {/* Main Message Text */}
                      {msg.text.startsWith('🎙️ Nota de voz (') ? (
                        <div className="flex items-center gap-3.5 py-1 min-w-[210px] select-none">
                          <button
                            type="button"
                            onClick={() => togglePlayAudio(msg.id)}
                            className="w-10 h-10 rounded-full bg-[#128c7e]/30 text-emerald-450 flex items-center justify-center shrink-0 hover:bg-[#128c7e]/50 active:scale-95 transition-all"
                          >
                            {playingAudioIds[msg.id] ? (
                              <Pause size={16} className="fill-emerald-400 text-emerald-400" />
                            ) : (
                              <Play size={16} className="fill-emerald-400 text-emerald-400 ml-0.5" />
                            )}
                          </button>
                          
                          <div className="flex-1 flex items-end gap-[2px] h-6 pb-0.5">
                            {[4, 7, 5, 8, 3, 6, 4, 8, 5, 9, 3, 6, 7, 4, 8, 5, 7, 6, 4, 3].map((h, bIdx) => (
                              <span
                                key={bIdx}
                                className={`w-[2px] rounded-full transition-all duration-300 ${
                                  playingAudioIds[msg.id] 
                                    ? 'bg-emerald-400 animate-pulse' 
                                    : 'bg-zinc-500'
                                }`}
                                style={{ 
                                  height: `${playingAudioIds[msg.id] ? (Math.sin(bIdx * 1.5) * 4 + 14) : h * 2.2}px`
                                }}
                              />
                            ))}
                          </div>
                          
                          <div className="flex flex-col items-end gap-0.5 shrink-0 pl-1">
                            <span className="text-[10px] text-zinc-400 font-bold font-mono">
                              {msg.text.match(/\(([^)]+)\)/)?.[1] || '0:05'}
                            </span>
                            <span className="text-[10px] text-emerald-450 font-black">🎙️</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs md:text-sm font-medium leading-relaxed break-words pr-8">
                          {msg.text}
                        </p>
                      )}

                      {/* Message Footer holding absolute Time metadata & Checkmarks */}
                      <div className="flex items-center justify-end gap-1 mt-1 text-[9px] font-bold text-zinc-400 italic">
                        <span>{formatShortTime(msg.timestamp)}</span>
                        {isMe && (
                          <span className="text-sky-450">
                            <CheckCheck size={12} strokeWidth={3} />
                          </span>
                        )}
                      </div>

                      {/* Floating actions menu visible on hover */}
                      <div className={`absolute top-2 ${isMe ? '-left-8' : '-right-8'} opacity-0 group-hover:opacity-100 transition-opacity bg-[#202c33]/90 border border-zinc-800 rounded-full p-1 flex items-center gap-1 shadow-lg z-20`}>
                        <button 
                          onClick={() => setReplyingTo(msg)}
                          title="Responder"
                          className="p-1 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors"
                        >
                          <CornerUpLeft size={11} strokeWidth={2.5} />
                        </button>
                        {isMe && (
                          <button 
                            onClick={() => handleDeleteMessage(msg.id)}
                            title="Eliminar mensaje"
                            className="p-1 hover:bg-white/10 rounded-full text-zinc-450 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Emoji Reaction Pill Panel over Chat Bubble */}
                    {hasReactions && (
                      <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#1e2c35] border border-zinc-800 shadow text-[10px] w-fit -mt-2.5 z-10 select-none ${
                        isMe ? 'self-end mr-3' : 'self-start ml-3'
                      }`}>
                        {Object.entries(msg.reactions || {}).map(([emoji, activeUids]) => {
                          const activeUidsArray = (activeUids || []) as string[];
                          const userLiked = activeUidsArray.includes(profile?.id || '');
                          return (
                            <button
                              key={emoji}
                              onClick={() => handleReaction(msg.id, emoji)}
                              className={`flex items-center gap-0.5 px-1 rounded-full transition-colors ${
                                userLiked ? 'bg-orange-500/20 text-orange-400 font-bold' : 'hover:bg-white/5 text-zinc-400'
                              }`}
                            >
                              <span>{emoji}</span>
                              <span className="text-[8px] font-black">{activeUidsArray.length}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Quick Reactions bar on bubble element tap */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 bg-[#202c33] border border-zinc-800/80 rounded-full shadow-2xl p-1 px-2 flex items-center gap-1.5 opacity-0 pointer-events-none group-focus-within:opacity-100 group-focus-within:pointer-events-auto transition-opacity -translate-y-5 z-25">
                      {POPULAR_EMOJIS.map((em) => (
                        <button
                          key={em}
                          onClick={() => handleReaction(msg.id, em)}
                          className="hover:scale-130 transition-transform text-sm p-0.5"
                        >
                          {em}
                        </button>
                      ))}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

          <div ref={messagesEndRef} />
        </div>

        {/* Reply To banner bar above Input area */}
        {replyingTo && (
          <div className="bg-[#1e2c35] p-3 px-6 flex items-center justify-between border-t border-zinc-800 z-15 text-xs">
            <div className="border-l-4 border-orange-500 pl-3">
              <p className="font-extrabold text-[10px] text-orange-400 uppercase tracking-widest mb-0.5">
                Respondiendo a {replyingTo.userName}
              </p>
              <p className="text-zinc-300 italic truncate max-w-xl">{replyingTo.text}</p>
            </div>
            <button 
              onClick={() => setReplyingTo(null)}
              className="p-1 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}

        {/* Message Editor & Input Controls Area */}
        <div className="p-3 bg-[#1f2c34] flex flex-col gap-2 z-10 border-t border-zinc-800/25">
          
          {/* Quick-Emoji Bar */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 px-1 border-b border-zinc-800/20 max-w-full">
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider whitespace-nowrap mr-1">Reacciones Rápidas:</span>
            {POPULAR_EMOJIS.map((em) => (
              <button
                key={em}
                onClick={() => {
                  if (messages.length > 0) {
                    // React to last message in chat
                    handleReaction(messages[messages.length - 1].id, em);
                  } else {
                    setInputText((prev) => prev + em);
                  }
                }}
                className="hover:scale-120 hover:bg-white/5 p-1 rounded transition-all text-xs"
              >
                {em}
              </button>
            ))}
          </div>

          {isRecording ? (
            <div className="flex items-center justify-between gap-3 bg-[#111b21] p-2 rounded-2xl border border-red-500/20 animate-pulse">
              <div className="flex items-center gap-2.5 px-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping shrink-0" />
                <span className="text-xs text-red-400 font-extrabold uppercase tracking-widest">
                  Grabando Audio...
                </span>
                <span className="text-xs text-white font-black font-mono pl-1 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                  {formatRecordingTime(recordingSeconds)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsRecording(false)}
                  className="p-2.5 bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 rounded-full transition-colors flex items-center justify-center"
                  title="Descartar nota de voz"
                >
                  <Trash2 size={16} />
                </button>
                
                <button
                  type="button"
                  onClick={handleSendVoiceNote}
                  className="w-10 h-10 bg-emerald-500 hover:bg-emerald-600 rounded-full flex items-center justify-center text-zinc-950 font-black transition-transform active:scale-95 shadow-md"
                  title="Enviar nota de voz"
                >
                  <Check size={20} strokeWidth={3} />
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-zinc-400 px-1">
                <button 
                  type="button" 
                  onClick={() => setInputText((prev) => prev + '⚽')} 
                  className="p-1.5 hover:bg-white/5 rounded-full hover:text-white transition-all"
                >
                  <Smile size={20} />
                </button>
                <button 
                  type="button" 
                  onClick={() => setInputText((prev) => prev + '🔥 POR EL MUNDIAL! 🏆')} 
                  className="p-1.5 hover:bg-white/5 rounded-full hover:text-white transition-all"
                  title="Insertar frase de aliento"
                >
                  <Paperclip size={20} />
                </button>
              </div>

              {/* Input fields with state indicators */}
              <div className="flex-1 bg-[#2a3942] rounded-xl flex items-center px-4 py-2 text-sm border border-zinc-800/20">
                <input
                  type="text"
                  placeholder="Escribe un mensaje..."
                  value={inputText}
                  onChange={handleInputChange}
                  className="bg-transparent border-none outline-none text-white placeholder-zinc-500 w-full font-semibold focus:ring-0 text-xs sm:text-sm"
                />
              </div>

              {/* Mic voice vs Send plane action toggles */}
              {inputText.trim() === '' ? (
                <button
                  type="button"
                  onClick={() => setIsRecording(true)}
                  className="w-11 h-11 rounded-full bg-[#202c33] hover:bg-[#2a3942] flex items-center justify-center text-emerald-400 hover:text-emerald-550 transition-all active:scale-95 shrink-0"
                  title="Grabar nota de voz"
                >
                  <Mic size={18} />
                </button>
              ) : (
                <button
                  type="submit"
                  className="w-11 h-11 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center text-black font-bold transition-transform active:scale-95 shadow-[0_0_15px_rgba(16,185,129,0.3)] shrink-0"
                >
                  <Send size={18} strokeWidth={2.5} className="ml-0.5" />
                </button>
              )}
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
