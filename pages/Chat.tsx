import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Send, 
  MoreVertical, 
  Phone, 
  Video, 
  Paperclip,
  Smile,
  Check,
  CheckCheck,
  Image as ImageIcon
} from 'lucide-react';

// --- Types ---

interface Contact {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline' | 'busy';
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  role: string;
}

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  isMe: boolean;
  status: 'sent' | 'delivered' | 'read';
}

// --- Mock Data ---

const MOCK_CONTACTS: Contact[] = [
  {
    id: '1',
    name: 'Ana Souza',
    avatar: 'AS',
    status: 'online',
    lastMessage: 'Já finalizei o fechamento da Tech.',
    lastMessageTime: '10:42',
    unreadCount: 2,
    role: 'Fiscal'
  },
  {
    id: '2',
    name: 'Carlos Oliveira',
    avatar: 'CO',
    status: 'busy',
    lastMessage: 'Vou precisar de ajuda no DP hoje.',
    lastMessageTime: '09:15',
    unreadCount: 0,
    role: 'Depto. Pessoal'
  },
  {
    id: '3',
    name: 'Mariana Costa',
    avatar: 'MC',
    status: 'offline',
    lastMessage: 'Obrigada!',
    lastMessageTime: 'Ontem',
    unreadCount: 0,
    role: 'Contábil'
  },
  {
    id: '4',
    name: 'Ricardo Lima',
    avatar: 'RL',
    status: 'online',
    lastMessage: 'Reunião às 14h?',
    lastMessageTime: 'Ontem',
    unreadCount: 0,
    role: 'Gestor'
  }
];

const MOCK_MESSAGES: Record<string, Message[]> = {
  '1': [
    { id: '1', senderId: '1', text: 'Bom dia! Tudo certo com o cliente Tech Solutions?', timestamp: '10:30', isMe: false, status: 'read' },
    { id: '2', senderId: 'me', text: 'Bom dia Ana. Sim, verifiquei os impostos, tudo ok.', timestamp: '10:35', isMe: true, status: 'read' },
    { id: '3', senderId: '1', text: 'Ótimo. Já finalizei o fechamento da Tech.', timestamp: '10:42', isMe: false, status: 'read' },
  ]
};

export const Chat: React.FC = () => {
  const [selectedContactId, setSelectedContactId] = useState<string | null>(MOCK_CONTACTS[0].id);
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState<Record<string, Message[]>>(MOCK_MESSAGES);
  const [searchTerm, setSearchTerm] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedContact = MOCK_CONTACTS.find(c => c.id === selectedContactId);
  const currentMessages = selectedContactId ? (messages[selectedContactId] || []) : [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages, selectedContactId]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedContactId) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: 'me',
      text: messageInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
      status: 'sent'
    };

    setMessages(prev => ({
      ...prev,
      [selectedContactId]: [...(prev[selectedContactId] || []), newMessage]
    }));

    setMessageInput('');
    
    // Simulating auto-reply for demo
    setTimeout(() => {
        setMessages(prev => {
            const replyMsg: Message = {
                id: (Date.now() + 1).toString(),
                senderId: selectedContactId,
                text: "Entendido, obrigado pelo aviso!",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isMe: false,
                status: 'read'
            };
            return {
                ...prev,
                [selectedContactId]: [...(prev[selectedContactId] || []), replyMsg]
            }
        })
    }, 2000);
  };

  const filteredContacts = MOCK_CONTACTS.filter(contact => 
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
      
      {/* Sidebar - Contact List */}
      <div className="w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-950/30">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Mensagens</h2>
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar equipe..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {filteredContacts.map(contact => (
            <button
              key={contact.id}
              onClick={() => setSelectedContactId(contact.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                selectedContactId === contact.id 
                  ? 'bg-indigo-50 dark:bg-indigo-500/10' 
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-semibold">
                  {contact.avatar}
                </div>
                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
                  contact.status === 'online' ? 'bg-emerald-500' :
                  contact.status === 'busy' ? 'bg-red-500' : 'bg-slate-400'
                }`} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex justify-between items-baseline mb-0.5">
                  <h3 className={`text-sm font-semibold truncate ${selectedContactId === contact.id ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-900 dark:text-white'}`}>
                    {contact.name}
                  </h3>
                  <span className="text-[10px] text-slate-400">{contact.lastMessageTime}</span>
                </div>
                <p className={`text-xs truncate ${selectedContactId === contact.id ? 'text-indigo-700/70 dark:text-indigo-300/70' : 'text-slate-500 dark:text-slate-400'}`}>
                  {contact.lastMessage}
                </p>
              </div>
              {contact.unreadCount > 0 && (
                <div className="shrink-0 w-5 h-5 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {contact.unreadCount}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      {selectedContact ? (
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Header */}
          <div className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 bg-white dark:bg-slate-900 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-semibold">
                {selectedContact.avatar}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{selectedContact.name}</h3>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${
                    selectedContact.status === 'online' ? 'bg-emerald-500' :
                    selectedContact.status === 'busy' ? 'bg-red-500' : 'bg-slate-400'
                  }`} />
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedContact.status === 'online' ? 'Online' : selectedContact.status === 'busy' ? 'Ocupado' : 'Offline'} &bull; {selectedContact.role}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <Phone size={20} />
              </button>
              <button className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <Video size={20} />
              </button>
              <button className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <MoreVertical size={20} />
              </button>
            </div>
          </div>

          {/* Messages List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4 bg-slate-50/50 dark:bg-slate-950/50">
            {currentMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <p className="text-sm">Inicie a conversa com {selectedContact.name}</p>
                </div>
            ) : (
                currentMessages.map((msg) => (
                <div 
                    key={msg.id} 
                    className={`flex gap-3 max-w-[80%] ${msg.isMe ? 'ml-auto flex-row-reverse' : ''}`}
                >
                    <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    msg.isMe 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300'
                    }`}>
                    {msg.isMe ? 'EU' : selectedContact.avatar}
                    </div>
                    
                    <div className={`group relative p-3 rounded-2xl shadow-sm text-sm ${
                    msg.isMe 
                        ? 'bg-indigo-600 text-white rounded-tr-none' 
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-tl-none'
                    }`}>
                    <p>{msg.text}</p>
                    <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${msg.isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                        <span>{msg.timestamp}</span>
                        {msg.isMe && (
                        <span>
                            {msg.status === 'sent' && <Check size={12} />}
                            {msg.status === 'delivered' && <CheckCheck size={12} />}
                            {msg.status === 'read' && <CheckCheck size={12} className="text-blue-300" />}
                        </span>
                        )}
                    </div>
                    </div>
                </div>
                ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSendMessage} className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
            <div className="flex items-end gap-2 bg-slate-100 dark:bg-slate-950/50 p-2 rounded-xl border border-transparent focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
              <button type="button" className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                <Paperclip size={20} />
              </button>
               <button type="button" className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors hidden sm:block">
                <ImageIcon size={20} />
              </button>
              
              <textarea
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => {
                    if(e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                    }
                }}
                placeholder="Digite sua mensagem..."
                className="flex-1 bg-transparent border-0 focus:ring-0 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 resize-none py-2.5 max-h-32 min-h-[44px]"
                rows={1}
              />
              
              <button type="button" className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors hidden sm:block">
                <Smile size={20} />
              </button>
              <button 
                type="submit" 
                disabled={!messageInput.trim()}
                className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors shadow-sm"
              >
                <Send size={18} />
              </button>
            </div>
            <div className="text-center mt-2">
                <p className="text-[10px] text-slate-400">Pressione Enter para enviar</p>
            </div>
          </form>

        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/30 dark:bg-slate-950/30 text-slate-400">
           <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <MoreVertical size={32} />
           </div>
           <p>Selecione uma conversa para começar</p>
        </div>
      )}
    </div>
  );
};