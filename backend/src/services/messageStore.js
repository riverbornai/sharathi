const HISTORY_LIMIT = 10;

// userId -> { platform, updatedAt, history: [{ role, content, timestamp }] }
const store = new Map();

module.exports = {
  addMessage: (userId, role, text, platform = "direct") => {
    if (!store.has(userId)) {
      store.set(userId, { platform, updatedAt: Date.now(), history: [] });
    }

    const conversation = store.get(userId);
    if (platform) {
      conversation.platform = platform;
    }

    conversation.history.push({ role, content: text, timestamp: Date.now() });

    if (conversation.history.length > HISTORY_LIMIT) {
      conversation.history.shift();
    }

    conversation.updatedAt = Date.now();
    store.set(userId, conversation);
  },

  // Returns the plain {role, content} shape expected by the OpenAI payload.
  getHistory: (userId) => {
    const conversation = store.get(userId);
    if (!conversation) return [];
    return conversation.history.map(({ role, content }) => ({ role, content }));
  },

  // Returns the full conversation record, including platform + timestamps.
  getConversation: (userId) => {
    const conversation = store.get(userId);
    if (!conversation) return null;
    return {
      userId,
      platform: conversation.platform,
      updatedAt: conversation.updatedAt,
      history: conversation.history,
    };
  },

  getAllConversations: () => {
    return Array.from(store.entries())
      .map(([userId, conversation]) => ({
        userId,
        platform: conversation.platform,
        updatedAt: conversation.updatedAt,
        messageCount: conversation.history.length,
        lastMessage: conversation.history[conversation.history.length - 1] || null,
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },

  clearHistory: (userId) => {
    store.delete(userId);
  },

  clearAll: () => {
    store.clear();
  },

  getStats: () => {
    return {
      activeUsers: store.size,
    };
  },
};
