import { useState, useEffect, useRef, useMemo } from 'react';
import { io } from 'socket.io-client';

// Single shared socket for the dashboard's live message feed.
const socket = io();

const PLATFORM_META = {
  facebook: {
    label: 'Facebook',
    color: '#1877F2',
    bg: 'rgba(24, 119, 242, 0.15)',
    icon: (
      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  direct: {
    label: 'Direct',
    color: '#D4F53C',
    bg: 'rgba(212, 245, 60, 0.15)',
    icon: (
      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
        <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" />
      </svg>
    ),
  },
};

function platformMeta(platform) {
  return (
    PLATFORM_META[platform] || {
      label: platform || 'Web',
      color: '#9FCEBE',
      bg: 'rgba(159, 206, 190, 0.15)',
      icon: (
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
        </svg>
      ),
    }
  );
}

function formatUserId(id = '') {
  if (!id) return 'Unknown Contact';
  if (id.length > 14 && /^\d+$/.test(id)) {
    return `User #${id.slice(0, 4)}...${id.slice(-4)}`;
  }
  return id;
}

function timeAgo(ts) {
  if (!ts) return '';
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatMsgTime(ts) {
  const d = ts ? new Date(ts) : new Date();
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function ConversationsPanel({ fullHeight = false }) {
  const [conversations, setConversations] = useState({});
  const [selected, setSelected] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');

  const scrollRef = useRef(null);

  const loadConversations = () => {
    setLoadingList(true);
    fetch('/api/messages')
      .then((r) => r.json())
      .then((data) => {
        const map = {};
        (data.conversations || []).forEach((c) => {
          map[c.userId] = {
            userId: c.userId,
            platform: c.platform,
            updatedAt: c.updatedAt,
            lastMessage: c.lastMessage,
            messages: null,
          };
        });
        setConversations(map);
        if (!selected) {
          const first = (data.conversations || [])[0];
          if (first) setSelected(first.userId);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingList(false));
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    const handleNewMessage = (msg) => {
      setConversations((prev) => {
        const existing = prev[msg.senderId];
        const nextMessages =
          existing && Array.isArray(existing.messages)
            ? [...existing.messages, { role: msg.role, content: msg.text, timestamp: Date.now() }]
            : existing
              ? existing.messages
              : null;

        return {
          ...prev,
          [msg.senderId]: {
            userId: msg.senderId,
            platform: msg.platform || existing?.platform || 'direct',
            updatedAt: Date.now(),
            lastMessage: { role: msg.role, content: msg.text, timestamp: Date.now() },
            messages: nextMessages,
          },
        };
      });

      setSelected((current) => current || msg.senderId);
    };

    const handleClearAll = () => {
      setConversations({});
      setSelected(null);
    };

    const handleClearUser = ({ userId }) => {
      setConversations((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      setSelected((current) => (current === userId ? null : current));
    };

    socket.on('new_message', handleNewMessage);
    socket.on('clear_all_messages', handleClearAll);
    socket.on('clear_user_message', handleClearUser);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('clear_all_messages', handleClearAll);
      socket.off('clear_user_message', handleClearUser);
    };
  }, []);

  useEffect(() => {
    if (!selected) return;
    const conv = conversations[selected];
    if (!conv || conv.messages !== null) return;

    fetch(`/api/messages/${encodeURIComponent(selected)}/history`)
      .then((r) => r.json())
      .then((data) => {
        setConversations((prev) => {
          const current = prev[selected];
          if (!current) return prev;
          return {
            ...prev,
            [selected]: {
              ...current,
              platform: data.platform || current.platform,
              messages: data.history || [],
            },
          };
        });
      })
      .catch(() => {
        setConversations((prev) => {
          const current = prev[selected];
          if (!current) return prev;
          return { ...prev, [selected]: { ...current, messages: [] } };
        });
      });
  }, [selected, conversations]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [selected, conversations[selected]?.messages?.length]);

  const clearAllHistory = async () => {
    if (!window.confirm('Are you sure you want to clear all message history?')) return;
    try {
      await fetch('/api/messages', { method: 'DELETE' });
      setConversations({});
      setSelected(null);
    } catch (err) {
      console.error('Failed to clear message history:', err);
    }
  };

  const clearThreadHistory = async (userId) => {
    if (!userId) return;
    try {
      await fetch(`/api/messages/${encodeURIComponent(userId)}`, { method: 'DELETE' });
      setConversations((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      if (selected === userId) setSelected(null);
    } catch (err) {
      console.error('Failed to clear thread history:', err);
    }
  };

  const filteredList = useMemo(() => {
    return Object.values(conversations)
      .filter((c) => {
        if (platformFilter !== 'all' && c.platform !== platformFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return c.userId.toLowerCase().includes(q) || c.lastMessage?.content?.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }, [conversations, platformFilter, searchQuery]);

  const active = selected ? conversations[selected] : null;
  const activeMeta = active ? platformMeta(active.platform) : null;

  return (
    <div
      className={`flex flex-col md:flex-row rounded-2xl bg-[#081410]/80 backdrop-blur-md overflow-hidden transition-all ${
        fullHeight ? 'h-full min-h-0' : 'h-[600px]'
      }`}
    >
      {/* Sidebar: Conversation List */}
      <div className="w-full md:w-[300px] flex-shrink-0 bg-black/20 flex flex-col">
        {/* Header & Search */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-mist/80 tracking-wider uppercase">Conversations</h2>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-lime font-mono px-2 py-0.5 rounded-full bg-lime/10">
                {Object.keys(conversations).length} active
              </span>
              {Object.keys(conversations).length > 0 && (
                <button
                  onClick={clearAllHistory}
                  className="text-[10px] text-red-400/80 hover:text-red-400 hover:bg-red-500/10 px-2 py-0.5 rounded transition-all font-medium"
                  title="Clear all message history"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user or message..."
              className="w-full pl-8 pr-3 py-1.5 bg-white/5 rounded-lg text-xs text-frost placeholder:text-mist/40 focus:outline-none focus:bg-white/10 transition-all"
            />
            <svg className="w-3.5 h-3.5 text-mist/40 absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Filter Pills */}
          <div className="flex gap-1">
            {['all', 'facebook', 'direct'].map((tab) => (
              <button
                key={tab}
                onClick={() => setPlatformFilter(tab)}
                className={`px-2.5 py-1 text-[10px] font-medium rounded-md capitalize transition-all ${
                  platformFilter === tab
                    ? 'bg-lime text-forest font-semibold'
                    : 'text-mist/60 hover:text-frost hover:bg-white/5'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Thread List Items */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingList ? (
            <div className="p-6 text-center text-xs text-mist/40">Loading conversations...</div>
          ) : filteredList.length === 0 ? (
            <div className="p-6 text-center text-xs text-mist/40">No messages found</div>
          ) : (
            filteredList.map((c) => {
              const meta = platformMeta(c.platform);
              const isSelected = selected === c.userId;
              const preview = c.lastMessage
                ? `${c.lastMessage.role === 'assistant' ? 'AI: ' : ''}${c.lastMessage.content}`
                : '';

              return (
                <button
                  key={c.userId}
                  onClick={() => setSelected(c.userId)}
                  className={`w-full text-left p-2.5 rounded-xl flex items-center gap-3 transition-all ${
                    isSelected ? 'bg-lime/15 text-frost' : 'hover:bg-white/5 text-mist/70'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0"
                    style={{ backgroundColor: meta.bg, color: meta.color }}
                  >
                    {meta.icon}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-xs truncate ${isSelected ? 'text-lime font-bold' : 'text-frost font-medium'}`}>
                        {formatUserId(c.userId)}
                      </span>
                      <span className="text-[10px] text-mist/40 flex-shrink-0">{timeAgo(c.updatedAt)}</span>
                    </div>
                    <p className="text-[11px] text-mist/50 truncate mt-0.5">{preview}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Thread Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-black/10">
        {active ? (
          <>
            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between flex-shrink-0 bg-black/20">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: activeMeta.bg, color: activeMeta.color }}
                >
                  {activeMeta.icon}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-frost">{formatUserId(active.userId)}</h3>
                  <div className="flex items-center gap-2 text-[11px] text-mist/50">
                    <span>{activeMeta.label} Channel</span>
                    <span>•</span>
                    <span className="text-lime flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-lime animate-pulse" />
                      AI Live Handled
                    </span>
                  </div>
                </div>
              </div>

              {/* Clear active thread button */}
              <button
                onClick={() => clearThreadHistory(active.userId)}
                className="text-xs text-mist/50 hover:text-red-400 hover:bg-white/5 px-2.5 py-1 rounded-lg transition-all"
                title="Delete this conversation thread"
              >
                Clear Thread
              </button>
            </div>

            {/* Message Stream */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
              {active.messages === null ? (
                <div className="p-8 text-center text-xs text-mist/40">Loading thread history...</div>
              ) : active.messages.length === 0 ? (
                <div className="p-8 text-center text-xs text-mist/40">No messages in this thread yet.</div>
              ) : (
                active.messages.map((m, i) => {
                  const isAssistant = m.role === 'assistant';
                  return (
                    <div
                      key={i}
                      className={`flex flex-col max-w-[80%] md:max-w-[70%] animate-msg-in ${
                        isAssistant ? 'self-end items-end' : 'self-start items-start'
                      }`}
                    >
                      {/* Sender label and time */}
                      <div className="flex items-center gap-1.5 text-[10px] text-mist/50 mb-1 px-1">
                        <span className={`font-semibold ${isAssistant ? 'text-lime' : 'text-mist/70'}`}>
                          {isAssistant ? 'Sharathi AI Agent' : 'User'}
                        </span>
                        <span>•</span>
                        <span>{formatMsgTime(m.timestamp)}</span>
                      </div>

                      {/* Message Bubble */}
                      <div
                        className={`px-4 py-2.5 rounded-2xl text-xs md:text-sm leading-relaxed ${
                          isAssistant
                            ? 'bg-lime text-forest font-medium rounded-tr-xs shadow-md'
                            : 'bg-white/10 text-frost rounded-tl-xs'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.content}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-xs text-mist/40 p-6 text-center">
            Select a conversation thread to view messages
          </div>
        )}
      </div>
    </div>
  );
}

export default ConversationsPanel;
