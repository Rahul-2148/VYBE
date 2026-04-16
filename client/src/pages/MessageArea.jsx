import axios from "axios";
import { Loader2, LucideImage, Search, SendHorizonal, X } from "lucide-react";
import moment from "moment";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { MdOutlineKeyboardBackspace } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { SERVER_URL } from "../App";
import dp from "../assets/dp3.png";
import ReceiverMessage from "../components/ReceiverMessage";
import SenderMessage from "../components/SenderMessage";
import {
  addMessage,
  setMessages,
  toggleVanish,
  updateMessage,
} from "../redux/features/messageSlice";
import { getSocket } from "../lib/socket";

/* ---------------- DATE HELPERS ---------------- */
const getDateLabel = (date) => {
  const d = moment(date);
  if (d.isSame(moment(), "day")) return "Today";
  if (d.isSame(moment().subtract(1, "day"), "day")) return "Yesterday";
  return d.format("DD MMM YYYY");
};

const MessageArea = () => {
  const { selectedChatUser, messages, vanishMode } = useSelector(
    (s) => s.message
  );
  const { userData } = useSelector((s) => s.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [input, setInput] = useState("");
  const [frontendFiles, setFrontendFiles] = useState([]);
  const [backendFiles, setBackendFiles] = useState([]);
  const [search, setSearch] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [activeDate, setActiveDate] = useState("");
  const [showDate, setShowDate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [replyTo, setReplyTo] = useState(null); // Reply/quote
  const [searchResults, setSearchResults] = useState([]);

  const bottomRef = useRef(null);
  const containerRef = useRef(null);
  const scrollTimeout = useRef(null);
  const fileInput = useRef(null);
  const messageRefs = useRef({});

  const isMobile = window.innerWidth < 768;

  /* ---------------- REDIRECT ---------------- */
  useEffect(() => {
    if (!selectedChatUser?.conversationId) navigate("/messages");
  }, [selectedChatUser, navigate]);

  /* ---------------- FETCH MESSAGES ---------------- */
  const fetchMessages = async (pageNo = 1, prepend = false) => {
    try {
      if (pageNo > 1) setLoadingMore(true);

      const res = await axios.get(
        `${SERVER_URL}/api/v1/message/${selectedChatUser.conversationId}?page=${pageNo}`,
        { withCredentials: true }
      );

      if (prepend) {
        dispatch(setMessages([...res.data.messages, ...messages]));
      } else {
        dispatch(setMessages(res.data.messages));
      }

      setHasMore(res.data.messages.length === 20);
      setLoadingMore(false);
    } catch {
      toast.error("Failed to load messages");
      setLoadingMore(false);
    }
  };

  /* ---------------- INITIAL LOAD ---------------- */
  useEffect(() => {
    if (!selectedChatUser?.conversationId) return;

    (async () => {
      await fetchMessages(1);
      scrollToBottom("auto");
      markConversationSeen();
    })();
  }, [selectedChatUser]);

  /* ---------------- SCROLL ---------------- */
  const scrollToBottom = (behavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
  };

  const scrollToMessage = (id) => {
    const el = messageRefs.current[id];
    if (!el) return;

    el.scrollIntoView({ behavior: "smooth", block: "center" });

    // Add flash class
    el.classList.add("flash-highlight");

    // Remove after 1.5s
    setTimeout(() => {
      el.classList.remove("flash-highlight");
    }, 1500);
  };

  useEffect(() => {
    if (messages.length && !search) scrollToBottom();
  }, [messages]);

  /* ---------------- REALTIME SOCKET ---------------- */
  useEffect(() => {
    if (!selectedChatUser?.conversationId) return;

    const socket = getSocket();
    const roomId = selectedChatUser.conversationId;

    socket.emit("conversation:join", roomId);

    const onMessageNew = (incomingMessage) => {
      if (String(incomingMessage?.conversation) !== String(roomId)) return;
      dispatch(addMessage(incomingMessage));
    };

    const onMessageUpdated = (incomingMessage) => {
      if (String(incomingMessage?.conversation) !== String(roomId)) return;
      dispatch(updateMessage(incomingMessage));
    };

    socket.on("message:new", onMessageNew);
    socket.on("message:updated", onMessageUpdated);

    return () => {
      socket.emit("conversation:leave", roomId);
      socket.off("message:new", onMessageNew);
      socket.off("message:updated", onMessageUpdated);
    };
  }, [dispatch, selectedChatUser?.conversationId]);

  /* ---------------- MARK SEEN ---------------- */
  const markConversationSeen = async () => {
    try {
      await axios.post(
        `${SERVER_URL}/api/v1/message/seen/${selectedChatUser.conversationId}`,
        {},
        { withCredentials: true }
      );
    } catch {}
  };

  /* ---------------- SCROLL HANDLER ---------------- */
  const handleScroll = async () => {
    const container = containerRef.current;
    if (!container) return;

    setShowDate(true);
    clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => setShowDate(false), 900);

    const nodes = container.querySelectorAll("[data-date]");
    for (let i = nodes.length - 1; i >= 0; i--) {
      const rect = nodes[i].getBoundingClientRect();
      if (rect.top <= 120) {
        setActiveDate(nodes[i].dataset.date);
        break;
      }
    }

    if (container.scrollTop < 50 && hasMore && !loadingMore) {
      const currentLength = messages.length;
      const nextPage = Math.floor(currentLength / 20) + 1;
      const prevHeight = container.scrollHeight;

      await fetchMessages(nextPage, true);
      container.scrollTop = container.scrollHeight - prevHeight;
    }
  };

  /* ---------------- SEARCH ---------------- */
  const handleSearch = async (q) => {
    setSearch(q);
    window.__search = q; // For highlight

    if (!q) {
      setSearchResults([]);
      return;
    }

    try {
      const res = await axios.get(
        `${SERVER_URL}/api/v1/message/search/${selectedChatUser.conversationId}?q=${q}`,
        { withCredentials: true }
      );
      setSearchResults(res.data.messages);

      // Auto-scroll to first result
      if (res.data.messages.length > 0) {
        const firstId = res.data.messages[0]._id;
        scrollToMessage(firstId);
      }
    } catch {
      toast.error("Failed to search messages");
    }
  };

  /* ---------------- DELETE FOR ME FILTER ---------------- */
  const visibleMessages = useMemo(() => {
    const filtered = messages.filter(
      (m) => !m.deletedFor?.includes(userData?.user?._id)
    );
    return search ? searchResults : filtered;
  }, [messages, searchResults, search, userData]);

  /* ---------------- SEND MESSAGE ---------------- */
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input && backendFiles.length === 0) return;

    setIsLoading(true);
    try {
      const fd = new FormData();
      fd.append("text", input);
      fd.append("conversationId", selectedChatUser.conversationId);
      fd.append("vanish", vanishMode);

      backendFiles.forEach((file) => {
        fd.append("media", file);
      });

      if (backendFiles.length === 0) fd.append("type", "text");
      if (replyTo) fd.append("replyTo", replyTo._id);

      const res = await axios.post(`${SERVER_URL}/api/v1/message/send`, fd, {
        withCredentials: true,
      });

      dispatch(addMessage(res.data.message));
      setInput("");
      setFrontendFiles([]);
      setBackendFiles([]);
      setReplyTo(null);
      setIsLoading(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Send failed");
      setIsLoading(false);
    }
  };

  const otherUser = selectedChatUser?.user;

  return (
    <div className="w-full h-screen bg-black flex flex-col">
      {/* HEADER */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-800">
        <MdOutlineKeyboardBackspace
          className="text-white w-6 h-6 cursor-pointer"
          onClick={() => navigate(isMobile ? "/messages" : "/")}
        />

        {!showSearch ? (
          <>
            <img
              src={otherUser?.profileImage?.url || dp}
              className="w-10 h-10 rounded-full"
            />
            <p className="text-white font-semibold flex-1 truncate">
              {otherUser?.userName}
            </p>

            <button
              onClick={() => dispatch(toggleVanish())}
              className={`text-xs ${
                vanishMode ? "text-pink-500" : "text-gray-400"
              }`}
            >
              Vanish
            </button>

            <Search
              className="text-gray-400 cursor-pointer"
              onClick={() => setShowSearch(true)}
            />
          </>
        ) : (
          <>
            <input
              autoFocus
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search messages or date"
              className="flex-1 bg-[#1a1f1f] px-4 py-2 rounded text-white outline-none"
            />
            <button
              onClick={() => {
                setSearch("");
                setShowSearch(false);
                setSearchResults([]);
              }}
              className="text-gray-400 text-sm"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </>
        )}
      </div>

      {/* STICKY DATE */}
      {showDate && activeDate && (
        <div className="fixed top-[70px] left-1/2 -translate-x-1/2 z-30">
          <div className="text-xs bg-[#1a1f1f]/90 px-4 py-1 rounded-full text-gray-300">
            {activeDate}
          </div>
        </div>
      )}

      {/* REPLY PREVIEW */}
      {replyTo && (
        <div className="bg-[#1a1f1f] px-4 py-2 text-sm text-gray-300 flex justify-between">
          <span>Replying to: {replyTo.content?.text?.slice(0, 40)}</span>
          <button onClick={() => setReplyTo(null)}>✕</button>
        </div>
      )}

      {/* MESSAGES */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-6"
      >
        {visibleMessages.map((m) => (
          <div
            key={m._id}
            id={`msg-${m._id}`}
            data-date={getDateLabel(m.createdAt)}
            ref={(el) => (messageRefs.current[m._id] = el)}
            onClick={() => search && scrollToMessage(m._id)}
          >
            {m.sender?._id === userData?.user?._id ? (
              <SenderMessage message={m} setReplyTo={setReplyTo} />
            ) : (
              <ReceiverMessage message={m} setReplyTo={setReplyTo} />
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* MEDIA PREVIEW */}
      {frontendFiles.length > 0 && (
        <div className="px-4 pb-2 flex gap-2 flex-wrap">
          {frontendFiles.map((src, i) => (
            <div key={i} className="relative w-20 h-20">
              <img src={src} className="w-full h-full object-cover rounded" />
              <button
                onClick={() => {
                  setFrontendFiles([]);
                  setBackendFiles([]);
                }}
                className="absolute top-1 right-1 bg-black/60 rounded-full p-1"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* INPUT */}
      <form
        onSubmit={handleSendMessage}
        className="h-[70px] flex items-center gap-3 px-4 border-t border-gray-800"
      >
        <input
          hidden
          ref={fileInput}
          type="file"
          multiple
          accept="image/*,video/*,.pdf,.doc,.docx"
          onChange={(e) => {
            const files = Array.from(e.target.files);
            setBackendFiles(files);
            setFrontendFiles(files.map((f) => URL.createObjectURL(f)));
          }}
        />

        <LucideImage
          onClick={() => fileInput.current.click()}
          className="text-purple-400 cursor-pointer"
        />

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message…"
          className="flex-1 bg-transparent outline-none text-white"
        />

        {(input || frontendFiles.length > 0) && (
          <button type="submit" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="animate-spin text-white" />
            ) : (
              <SendHorizonal className="text-white" />
            )}
          </button>
        )}
      </form>
    </div>
  );
};

export default MessageArea;
