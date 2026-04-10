import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Send, Search, Loader2, MoreVertical, Plus } from 'lucide-react';
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

    const handleSearchUser = async () => {
        if (!searchUsername.trim()) return;
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
        } else {
            setIsLoading(false);
        }
    }, [user, fetchConversations]);

    if (isLoading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-orange-500" /></div>;

    if (showNewMessage) {
        return (
            <div className="bg-black min-h-screen p-6">
                <header className="flex items-center justify-between mb-6">
                    <button onClick={() => setShowNewMessage(false)}><ArrowLeft /></button>
                    <h1 className="text-xl font-bold">New Message</h1>
                    <div className="w-8" />
                </header>
                
                <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        placeholder="Search username..."
                        value={searchUsername}
                        onChange={(e) => setSearchUsername(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchUser()}
                        className="w-full bg-gray-900 rounded-2xl py-3 pl-12 pr-4 focus:outline-none"
                    />
                </div>

                <button 
                    onClick={handleSearchUser}
                    disabled={isSearching}
                    className="w-full bg-orange-500 py-3 rounded-xl font-bold mb-4"
                >
                    {isSearching ? 'Searching...' : 'Search'}
                </button>

                <div className="space-y-2">
                    {searchResults.map(result => (
                        <button
                            key={result.id}
                            onClick={() => handleStartConversation(result.id)}
                            className="w-full flex items-center space-x-4 p-4 hover:bg-gray-900 rounded-2xl transition-colors"
                        >
                            <div className="w-12 h-12 rounded-full bg-gray-800 overflow-hidden">
                                {result.avatar_url ? (
                                    <img src={result.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-orange-500/20 text-orange-500 font-bold">
                                        {result.username[0]?.toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <span className="font-medium">@{result.username}</span>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-black min-h-screen">
            <header className="p-6 border-b border-gray-900 flex justify-between items-center">
                <h1 className="text-2xl font-bold">Messages</h1>
                <button onClick={() => setShowNewMessage(true)} className="bg-orange-500 p-2 rounded-full"><Plus className="w-6 h-6" /></button>
            </header>

            <div className="p-4">
                <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        placeholder="Search chats..."
                        className="w-full bg-gray-900 rounded-2xl py-3 pl-12 focus:outline-none"
                    />
                </div>

                {conversations.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">
                        <p>No conversations yet.</p>
                        <p className="text-sm">Start chatting with creators!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {conversations.map(conv => (
                            <button
                                key={conv.id}
                                onClick={() => onSelect(conv.id)}
                                className="w-full flex items-center space-x-4 p-4 hover:bg-gray-900 rounded-2xl transition-colors"
                            >
                                <div className="w-14 h-14 rounded-full bg-gray-800 overflow-hidden">
                                    {conv.other_user.avatar_url ? (
                                        <img src={conv.other_user.avatar_url} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-orange-500/20 text-orange-500 font-bold">
                                            {conv.other_user?.username?.[0]?.toUpperCase() || '?'}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 text-left">
                                    <div className="flex justify-between items-center mb-1">
                                        <h4 className="font-bold">{conv.other_user.display_name || conv.other_user.username}</h4>
                                        <span className="text-xs text-gray-500">
                                            {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-400 truncate">{conv.last_message}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const ChatView: React.FC<{ conversationId: string; onBack: () => void }> = ({ conversationId, onBack }) => {
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
            .select('participant_1, participant_2, u1:participant_1(username, avatar_url), u2:participant_2(username, avatar_url)')
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

const Messages: React.FC = () => {
    const [selectedId, setSelectedId] = useState<string | null>(null);

    return (
        <div>
            {selectedId ? (
                <ChatView conversationId={selectedId} onBack={() => setSelectedId(null)} />
            ) : (
                <ConversationList onSelect={setSelectedId} />
            )}
        </div>
    );
};

export default Messages;
