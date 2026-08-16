# Socket.IO Implementation Guide - VYBE

## 📡 Overview

Socket.IO is now fully integrated into VYBE for real-time communication. This guide explains how to use it in your components.

## 🚀 Quick Start

### 1. Initialize Socket in App
Already done in `App.jsx`!

```jsx
useEffect(() => {
  if (userData?._id) {
    initializeSocket(userData._id);
  }
}, [userData]);
```

### 2. Use in Your Components

```jsx
import { getSocket, sendMessage, onMessageReceived } from '../lib/socket';

function MessageArea() {
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Listen for incoming messages
    onMessageReceived((data) => {
      console.log('Message received:', data);
    });
  }, []);
}
```

## 📨 Messaging Events

### Send a Message (Client → Server → Client)

```jsx
import { sendMessage } from '../lib/socket';

const handleSendMessage = () => {
  sendMessage(
    conversationId,           // The conversation ID
    recipientId,              // The recipient's user ID
    messageContent            // Message object with content
  );
};
```

### Listen for Message Received

```jsx
import { onMessageReceived } from '../lib/socket';

useEffect(() => {
  const unsubscribe = onMessageReceived((data) => {
    const { conversationId, message, unreadCount } = data;
    
    // Update your Redux store or state
    dispatch(addMessage(message));
    
    // Show snackbar notification
    snackbar.success(`New message from ${message.sender.userName}`);
  });

  return () => unsubscribe?.();
}, []);
```

### Listen for Message Status

```jsx
import { onMessageDelivered, onMessageSent } from '../lib/socket';

// Message delivered to server
const unsubDelivered = onMessageDelivered((data) => {
  // Update message status to "delivered"
  dispatch(updateMessageStatus({ id: data.messageId, status: 'delivered' }));
});

// Message sent confirmation
const unsubSent = onMessageSent((data) => {
  // Update message status to "sent"
  dispatch(updateMessageStatus({ id: data.messageId, status: 'sent' }));
});
```

### Listen for Read Receipts

```jsx
import { onMessageReadReceipt } from '../lib/socket';

useEffect(() => {
  const unsubscribe = onMessageReadReceipt((data) => {
    const { messageId, readBy, readAt } = data;
    
    // Update message to show who read it
    dispatch(updateMessageReadStatus({
      messageId,
      readBy,
      readAt
    }));
  });

  return () => unsubscribe?.();
}, []);
```

## ⌨️ Typing Indicators

### Show Typing Indicator

```jsx
import { emitTyping, emitStopTyping } from '../lib/socket';

const handleInputChange = (text) => {
  if (text) {
    emitTyping(conversationId);
  }
};

const handleInputBlur = () => {
  emitStopTyping(conversationId);
};

// JSX
<input
  onChange={(e) => handleInputChange(e.target.value)}
  onBlur={handleInputBlur}
  placeholder="Type a message..."
/>
```

### Listen for Typing Indicator

```jsx
import { onUserTyping } from '../lib/socket';

const [typingUsers, setTypingUsers] = useState(new Set());

useEffect(() => {
  const unsubscribe = onUserTyping((data) => {
    if (data.conversationId === conversationId) {
      setTypingUsers(prev => {
        const updated = new Set(prev);
        if (data.isTyping) {
          updated.add(data.userId);
        } else {
          updated.delete(data.userId);
        }
        return updated;
      });
    }
  });

  return () => unsubscribe?.();
}, [conversationId]);

// Render typing indicator
{typingUsers.size > 0 && (
  <div className="text-gray-500 text-sm">
    {Array.from(typingUsers).join(', ')} is typing...
  </div>
)}
```

## 👤 Online Status & Presence

### Broadcast User Status

```jsx
import { updatePresence } from '../lib/socket';

useEffect(() => {
  // Mark user as online
  updatePresence('online', new Date());

  // Handle page visibility
  const handleVisibilityChange = () => {
    if (document.hidden) {
      updatePresence('away', new Date());
    } else {
      updatePresence('online', new Date());
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}, []);
```

### Use Online Status Hook

```jsx
import { useUserOnlineStatus } from '../hooks/useUserOnlineStatus';

function ChatListItem({ user }) {
  const { isUserOnline, getUserStatus } = useUserOnlineStatus();
  const isOnline = isUserOnline(user._id);

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <img src={user.profileImage} className="w-10 h-10 rounded-full" />
        {isOnline && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
        )}
      </div>
      <span>{user.userName} {isOnline ? '🟢 Online' : '⚪ Offline'}</span>
    </div>
  );
}
```

## 💬 Conversation Management

### Join a Conversation

```jsx
import { joinConversation } from '../lib/socket';

useEffect(() => {
  joinConversation(conversationId);

  return () => {
    // Optionally leave on unmount
    // leaveConversation(conversationId);
  };
}, [conversationId]);
```

### Listen for Users Joining/Leaving

```jsx
import { onUserJoinedConversation, onUserLeftConversation } from '../lib/socket';

useEffect(() => {
  const unsubJoined = onUserJoinedConversation((data) => {
    snackbar.info(`${data.userId} joined the conversation`);
  });

  const unsubLeft = onUserLeftConversation((data) => {
    snackbar.info(`${data.userId} left the conversation`);
  });

  return () => {
    unsubJoined?.();
    unsubLeft?.();
  };
}, []);
```

## 🔔 Notifications

### Send Notification to User

```jsx
import { sendNotification } from '../lib/socket';

const notifyUserNewPost = (userId, postData) => {
  sendNotification(userId, 'new-post', {
    postId: postData._id,
    postCaption: postData.caption,
    posterName: postData.author.userName,
  });
};
```

### Listen for Notifications

```jsx
import { onNotificationReceived } from '../lib/socket';

useEffect(() => {
  const unsubscribe = onNotificationReceived((data) => {
    const { type, from, payload } = data;

    if (type === 'new-post') {
      snackbar.success(`${payload.posterName} posted something!`);
    } else if (type === 'new-like') {
      snackbar.success(`${payload.userName} liked your post`);
    } else if (type === 'new-follow') {
      snackbar.success(`${payload.userName} started following you`);
    }
  });

  return () => unsubscribe?.();
}, []);
```

## 😊 Reactions

### Send Reaction to Message

```jsx
import { sendReaction } from '../lib/socket';

const handleReactToMessage = (messageId, emoji) => {
  sendReaction(conversationId, emoji, messageId);
};

// JSX
<button onClick={() => handleReactToMessage(message._id, '❤️')}>
  ❤️
</button>
```

### Listen for Reactions

```jsx
import { onReactionReceived } from '../lib/socket';

useEffect(() => {
  const unsubscribe = onReactionReceived((data) => {
    const { userId, type, targetId } = data;
    
    // Update message with reaction
    dispatch(addReactionToMessage({
      messageId: targetId,
      userId,
      emoji: type
    }));
  });

  return () => unsubscribe?.();
}, []);
```

## 🪝 Using the Custom Hooks

### useUserOnlineStatus

```jsx
import { useUserOnlineStatus } from '../hooks/useUserOnlineStatus';

function App() {
  const {
    onlineUsers,              // Set of online user IDs
    userPresence,             // Object with status info
    activeUsersCount,         // Total active users
    isUserOnline,             // Function to check if user online
    getUserStatus             // Function to get user status
  } = useUserOnlineStatus();

  return (
    <div>
      <p>Active users: {activeUsersCount}</p>
      {Array.from(onlineUsers).map(userId => (
        <div key={userId}>User {userId} is online</div>
      ))}
    </div>
  );
}
```

### useMessageSocketEvents

```jsx
import { useMessageSocketEvents } from '../hooks/useMessageSocketEvents';

function MessageArea({ conversationId }) {
  useMessageSocketEvents(conversationId);
  // This hook automatically sets up all message listeners
  // You can dispatch Redux actions inside the hook
}
```

### useTypingIndicator

```jsx
import { useTypingIndicator } from '../hooks/useTypingIndicator';

function ChatInput({ conversationId }) {
  const { typingUsers, setTyping, stopTyping, isAnyoneTyping } = useTypingIndicator(conversationId);

  return (
    <>
      <input
        onChange={(e) => {
          if (e.target.value) setTyping();
        }}
        onBlur={stopTyping}
        placeholder="Type a message..."
      />
      {isAnyoneTyping && <p>Someone is typing...</p>}
    </>
  );
}
```

## 🔌 Socket Connection Lifecycle

### Manual Connection Check

```jsx
import { getSocket, disconnectSocket } from '../lib/socket';

const socket = getSocket();

if (socket?.connected) {
  console.log('Socket is connected');
} else {
  console.log('Socket is disconnected');
}

// Manual disconnect
disconnectSocket();
```

### Handling Connection Errors

```jsx
import { getSocket } from '../lib/socket';

useEffect(() => {
  const socket = getSocket();
  if (!socket) return;

  const handleError = (error) => {
    console.error('Socket error:', error);
    snackbar.error('Connection error');
  };

  socket.on('error', handleError);

  return () => socket.off('error', handleError);
}, []);
```

## 🛡️ Security Best Practices

### 1. Always Verify User Identity
```javascript
// Server-side socket middleware (already implemented)
io.use((socket, next) => {
  const userId = socket.handshake.auth.userId;
  if (!userId) return next(new Error("User ID required"));
  socket.userId = userId;
  next();
});
```

### 2. Validate Permissions
```javascript
// Check if user is participant before emitting
const conversation = await Conversation.findById(conversationId);
if (!conversation.participants.includes(userId)) {
  return socket.emit('error', { message: 'Not a participant' });
}
```

### 3. Rate Limiting (TODO)
```javascript
// Add rate limiting for socket events
// Install: npm i socket.io-rate-limiter
```

## 📊 Performance Tips

### 1. Debounce Typing Events
```jsx
const [typingTimeout, setTypingTimeout] = useState(null);

const handleInputChange = (text) => {
  clearTimeout(typingTimeout);
  
  if (text) {
    emitTyping(conversationId);
  }
  
  setTypingTimeout(
    setTimeout(() => emitStopTyping(conversationId), 3000)
  );
};
```

### 2. Batch Message Updates
```jsx
// Instead of updating one message at a time
// Collect updates and apply them in batches
const [pendingUpdates, setPendingUpdates] = useState([]);

useEffect(() => {
  const timer = setTimeout(() => {
    if (pendingUpdates.length > 0) {
      dispatch(updateMessagesInBatch(pendingUpdates));
      setPendingUpdates([]);
    }
  }, 100); // Batch every 100ms

  return () => clearTimeout(timer);
}, [pendingUpdates]);
```

### 3. Memory Management
```jsx
// Clean up listeners on unmount
useEffect(() => {
  const unsub1 = onMessageReceived(handler1);
  const unsub2 = onMessageDelivered(handler2);

  return () => {
    unsub1?.();
    unsub2?.();
  };
}, []);
```

## 🧪 Testing Socket Events

### Manual Testing in Console

```javascript
// Check socket connection
const { getSocket } = await import('./lib/socket.js');
const socket = getSocket();
console.log('Connected:', socket?.connected);

// Emit test event
socket?.emit('test-event', { data: 'test' });

// Listen for events
socket?.on('test-response', console.log);
```

## 📚 Additional Resources

- [Socket.IO Documentation](https://socket.io/docs/)
- [Socket.IO Best Practices](https://socket.io/docs/v4/socket-io-usage-examples/)
- [Socket.IO Troubleshooting](https://socket.io/docs/v4/troubleshooting-connection-issues/)

---

**Happy building! 🚀**
