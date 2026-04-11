import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Send, Search, Loader2, MoreVertical, Plus, Video } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useApp } from '../hooks/useApp';

interface Conversation {
    id: string;
    participant_1: string;
    participant_2: string;
    last_message: string;
    last_message_at: string;
    other_user: {
        id: string;
        username: string;
        display_name: string;
        avatar_url: string | null;
    };
}

interface Message {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    created_at: string;
}

const ConversationList: React.FC<{ onSelect: (id: string) => void }> = ({ onSelect }) => {
    const { user } = useApp();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showNewMessage, setShowNewMessage] = useState(false);
    const [searchUsername, setSearchUsername] = useState('');
    const [searchResults, setSearchResults] = useState<{id: string; username: string; avatar_url: string | null}[]>([]);
    const [suggestedCreators, setSuggestedCreators] = useState<{id: string; username: string; avatar_url: string | null}[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const fetchConversations = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('conversations')
                .select(`
                    *,
                    u1:participant_1 (id, username, display_name, avatar_url),
                    u2:participant_2 (id, username, display_name, avatar_url)
                `)
                .or(`participant_1.eq.${user?.id},participant_2.eq.${user?.id}`)
                .order('last_message_at', { ascending: false });

            if (error) throw error;

            const formatted: Conversation[] = (data || []).map((conv) => {
                const otherUser = conv.participant_1 === user?.id ? conv.u2 : conv.u1;
                return {
                    ...conv,
                    other_user: Array.isArray(otherUser) ? otherUser[0] : otherUser
                };
            });

            setConversations(formatted);
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [user?.id]);

    const fetchSuggestedCreators = useCallback(async () => {
        try {
            const { data } = await supabase
                .from('users')
                .select('id, username, avatar_url')
                .eq('is_creator', true)
                .neq('id', user?.id)
                .order('earnings', { ascending: false })
                .limit(5);
            setSuggestedCreators(data || []);
        } catch (err) {
            console.error('Fetch suggested error:', err);
        }
    }, [user?.id]);

    const handleSearchUser = async () => {
        if (!searchUsername.trim()) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const { data } = await supabase
                .from('users')
                .select('id, username, avatar_url')
                .ilike('username', `%${searchUsername}%`)
                .neq('id', user?.id)
                .limit(10);
            setSearchResults(data || []);
        } catch (err) {
            console.error('Search error:', err);
        } finally {
            setIsSearching(false);
        }
    };

    const handleStartConversation = async (otherUserId: string) => {
        if (!user) return;
        try {
            const { data: existing } = await supabase
                .from('conversations')
                .select('id')
                .or(`and(participant_1.eq.${user.id},participant_2.eq.${otherUserId}),and(participant_1.eq.${otherUserId},participant_2.eq.${user.id})`)
                .single();
            
            if (existing) {
                onSelect(existing.id);
                setShowNewMessage(false);
                return;
            }

            const { data: newConv, error } = await supabase
                .from('conversations')
                .insert({
                    participant_1: user.id,
                    participant_2: otherUserId,
                    last_message: '',
                    last_message_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            if (newConv) {
                onSelect(newConv.id);
                setShowNewMessage(false);
            }
        } catch (err) {
            console.error('Error starting conversation:', err);
        }
    };

    useEffect(() => {
        if (user) {
            fetchConversations();
            fetchSuggestedCreators();
        } else {
            setIsLoading(false);
        }
    }, [user, fetchConversations, fetchSuggestedCreators]);

    if (isLoading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-orange-500" /></div>;

    if (showNewMessage) {
        return (
        <div className="bg-black min-h-screen text-white font-['Outfit']">
            <header className="px-6 py-8 flex items-center justify-between">
                <button onClick={() => setShowNewMessage(false)} className="p-2 glass rounded-full hover:bg-white/10 transition-all">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-2xl font-bold tracking-tight">Direct Message</h1>
                <div className="w-9" />
            </header>
            
            <div className="px-6 space-y-8">
                {/* Search Bar */}
                <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-pink-500/20 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                    <div className="relative glass-light rounded-2xl flex items-center px-4 py-1 border border-white/5 group-focus-within:border-orange-500/30 transition-all">
                        <Search className="w-5 h-5 text-white/40" />
                        <input
                            placeholder="Find a creator..."
                            value={searchUsername}
                            onChange={(e) => setSearchUsername(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearchUser()}
                            className="w-full bg-transparent py-4 pl-4 focus:outline-none text-white placeholder:text-white/20"
                        />
                        {searchUsername && (
                            <button 
                                onClick={handleSearchUser}
                                className="bg-orange-500 text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-orange-600 transition-colors"
                            >
                                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Search Results / Suggestions */}
                <div className="space-y-6">
                   <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 px-2">
                       {searchResults.length > 0 ? 'Search Results' : 'Suggested for you'}
                   </h3>
                   
                   {searchResults.length === 0 && !isSearching && !searchUsername && suggestedCreators.length === 0 && (
                       <div className="p-8 glass-light rounded-3xl border border-white/5 text-center">
                           <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                               <Search className="w-8 h-8 text-white/20" />
                           </div>
                           <p className="text-white/40 text-sm">Type a handle to find creators across South Africa</p>
                       </div>
                   )}

                   <div className="grid grid-cols-1 gap-3">
                        {/* Display search results or suggestions */}
                        {(searchUsername ? searchResults : suggestedCreators).map((result, index) => (
                            <motion.button
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                key={result.id}
                                onClick={() => handleStartConversation(result.id)}
                                className="w-full flex items-center space-x-4 p-4 glass-light hover:bg-white/10 rounded-2xl border border-white/0 hover:border-white/10 transition-all group"
                            >
                                <div className="relative">
                                    <div className="w-14 h-14 rounded-full bg-gray-800 overflow-hidden border-2 border-white/10 group-hover:border-orange-500/50 transition-colors">
                                        {result.avatar_url ? (
                                            <img src={result.avatar_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-orange-500/20 text-orange-500 font-bold text-xl">
                                                {result.username[0]?.toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-black" />
                                </div>
                                <div className="flex-1 text-left">
                                    <span className="font-bold text-lg group-hover:text-orange-400 transition-colors">@{result.username}</span>
                                    <p className="text-white/40 text-xs">Available for video calls</p>
                                </div>
                                <div className="p-2 glass rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Plus className="w-5 h-5 text-orange-500" />
                                </div>
                            </motion.button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

return (
    <div className="bg-black min-h-screen text-white font-['Outfit'] pb-24">
        <header className="p-6 pt-12 flex justify-between items-center bg-gradient-to-b from-black to-transparent">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tighter">Messages</h1>
                <p className="text-white/40 text-sm font-medium">Chat with creators & friends</p>
            </div>
            <button 
                onClick={() => setShowNewMessage(true)} 
                className="bg-orange-500 hover:bg-orange-600 p-4 rounded-3xl shadow-lg shadow-orange-500/20 transition-all active:scale-95"
            >
                <Plus className="w-6 h-6" />
            </button>
        </header>

        <div className="px-6 space-y-6">
            <div className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                <input
                    placeholder="Search recent chats..."
                    className="w-full glass-light rounded-2xl py-5 pl-14 pr-4 border border-white/5 focus:outline-none focus:border-orange-500/30 transition-all placeholder:text-white/20"
                />
            </div>

            {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 px-10 text-center glass-light rounded-3xl border border-white/5">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                        <Plus className="w-8 h-8 text-white/20" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">No conversations</h3>
                    <p className="text-white/40 text-sm mb-8 leading-relaxed">
                        Start your first conversation with a creator and begin earning or sharing!
                    </p>
                    <button 
                        onClick={() => setShowNewMessage(true)}
                        className="bg-white text-black px-8 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-colors"
                    >
                        Start Chatting
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {conversations.map((conv, i) => (
                        <motion.button
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            key={conv.id}
                            onClick={() => onSelect(conv.id)}
                            className="w-full flex items-center space-x-4 p-5 glass-light hover:bg-white/10 rounded-3xl border border-white/5 transition-all group relative overflow-hidden"
                        >
                            <div className="w-16 h-16 rounded-3xl bg-gray-800 overflow-hidden border border-white/10 shadow-lg group-hover:scale-105 transition-transform">
                                {conv.other_user.avatar_url ? (
                                    <img src={conv.other_user.avatar_url} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-orange-500/20 text-orange-500 font-bold text-2xl">
                                        {conv.other_user?.username?.[0]?.toUpperCase() || '?'}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 text-left">
                                <div className="flex justify-between items-center mb-1">
                                    <h4 className="font-bold text-lg group-hover:text-orange-400 transition-colors">
                                        {conv.other_user.display_name || conv.other_user.username}
                                    </h4>
                                    <span className="text-[10px] uppercase font-bold tracking-widest text-white/30 bg-white/5 px-2 py-1 rounded-full">
                                        {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <p className="text-sm text-white/50 truncate max-w-[200px]">
                                    {conv.last_message || 'Start a conversation...'}
                                </p>
                            </div>
                            
                            <div className="w-2 h-2 bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,1)]" />
                        </motion.button>
                    ))}
                </div>
            )}
        </div>
    </div>
);
};

const ChatView: React.FC<{ 
    conversationId: string; 
    onBack: () => void;
    onCallUser?: (userId: string) => void;
}> = ({ conversationId, onBack, onCallUser }) => {
    const { user } = useApp();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [otherUser, setOtherUser] = useState<{ id?: string; username: string; display_name?: string; avatar_url: string | null } | null>(null);

    const fetchMessages = useCallback(async () => {
        const { data } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });
        setMessages(data || []);
    }, [conversationId]);

    const fetchOtherUser = useCallback(async () => {
        const { data: conv } = await supabase
            .from('conversations')
            .select('participant_1, participant_2, u1:participant_1(id, username, avatar_url), u2:participant_2(id, username, avatar_url)')
            .eq('id', conversationId)
            .single();

        if (conv) {
            const other = conv.participant_1 === user?.id ? conv.u2 : conv.u1;
            setOtherUser(Array.isArray(other) ? other[0] : other);
        }
    }, [conversationId, user?.id]);

    const subscribeToMessages = useCallback(() => {
        return supabase
            .channel(`chat:${conversationId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${conversationId}`
            }, (payload) => {
                setMessages(prev => [...prev, payload.new as Message]);
            })
            .subscribe();
    }, [conversationId]);

    useEffect(() => {
        const fetchEverything = async () => {
            await fetchMessages();
            await fetchOtherUser();
        };
        fetchEverything();
        const sub = subscribeToMessages();
        return () => { sub.unsubscribe(); };
    }, [conversationId, fetchMessages, fetchOtherUser, subscribeToMessages]);

    const handleSend = async () => {
        if (!newMessage.trim() || !user) return;
        const msg = newMessage;
        setNewMessage('');

        const { error } = await supabase
            .from('messages')
            .insert({
                conversation_id: conversationId,
                sender_id: user.id,
                content: msg
            });

        if (error) {
            setNewMessage(msg);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-black">
            <header className="p-4 border-b border-gray-900 flex items-center space-x-4">
                <button onClick={onBack}><ArrowLeft /></button>
                <div className="flex-1">
                    <h4 className="font-bold">{otherUser?.username || 'Chat'}</h4>
                    <p className="text-xs text-green-500">Online</p>
                </div>
                {onCallUser && otherUser?.id && (
                    <button 
                        onClick={() => onCallUser(otherUser.id!)}
                        className="p-2 hover:bg-white/10 rounded-full text-orange-500 transition-all"
                    >
                        <Video className="w-6 h-6" />
                    </button>
                )}
                <button><MoreVertical /></button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-2xl ${msg.sender_id === user?.id ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-200'
                            }`}>
                            {msg.content}
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 border-t border-gray-900 flex items-center space-x-2">
                <input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Type a message..."
                    className="flex-1 bg-gray-900 rounded-2xl p-4 focus:outline-none"
                />
                <button
                    onClick={handleSend}
                    className="bg-orange-500 p-4 rounded-full text-white"
                >
                    <Send className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

const Messages: React.FC<{ onCallUser?: (userId: string) => void }> = ({ onCallUser }) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);

    return (
        <div>
            {selectedId ? (
                <ChatView 
                    conversationId={selectedId} 
                    onBack={() => setSelectedId(null)} 
                    onCallUser={onCallUser}
                />
            ) : (
                <ConversationList onSelect={setSelectedId} />
            )}
        </div>
    );
};

export default Messages;
