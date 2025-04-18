import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import API_BASE_URL from "../config";
import { useUserColors } from "../context/UserColorContext";
import LoadingScreen from "./LoadingScreen";

const ChatWindow = ({ channel, user, onBack, onToggleMemberList, customMessage }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [memberInfo, setMemberInfo] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef(null);
  const socketRef = useRef(null);
  const messageContainerRef = useRef(null);
  const [serverMembers, setServerMembers] = useState([]);
  const { userColorMap, setUserColors } = useUserColors();

  // Hàm cuộn xuống cuối tin nhắn
  const scrollToBottom = () => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  };

  // Cuộn xuống cuối khi component mount hoặc có tin nhắn mới
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToBottom();
      setIsLoading(false);
    }, 1);

    return () => clearTimeout(timer);
  }, [messages]);

  // Fetch server members and set up colors
  useEffect(() => {
    if (!channel) return;

    const fetchMembers = async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/server-members/${channel.server_id}`
        );
        setServerMembers(response.data);
        setUserColors(response.data);
      } catch (error) {
        console.error("Error fetching members:", error);
      }
    };

    fetchMembers();
  }, [channel, setUserColors]);

  const handleMemberClick = (username, event) => {
    const member = serverMembers.find((m) => m.username === username);
    if (!member) return;

    const rect = event.target.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left,
      y: rect.bottom + window.scrollY,
    });
    setMemberInfo(member);
  };

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (memberInfo && !event.target.closest(".member-name")) {
        setMemberInfo(null);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [memberInfo]);

  // Initialize socket connection
  useEffect(() => {
    socketRef.current = io(API_BASE_URL, {
      withCredentials: true,
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socketRef.current.on("connect", () => setIsConnected(true));
    socketRef.current.on("disconnect", () => setIsConnected(false));

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  // Handle channel join and message listening
  useEffect(() => {
    if (!channel || !socketRef.current) return;

    socketRef.current.emit("join-channel", channel.id);

    const handleNewMessage = (message) => {
      setMessages((prev) => [
        ...prev,
        { ...message, created_at: formatDate(message.created_at) },
      ]);
    };

    socketRef.current.on("new-message", handleNewMessage);

    const fetchMessages = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/messages/${channel.id}`);
        setMessages(
          res.data.map((msg) => ({
            ...msg,
            created_at: formatDate(msg.created_at),
          }))
        );
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };

    fetchMessages();

    return () => {
      socketRef.current.emit("leave-channel", channel.id);
      socketRef.current.off("new-message", handleNewMessage);
    };
  }, [channel]);

  // Format date for messages
  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return `${String(date.getDate()).padStart(2, "0")}/${String(
      date.getMonth() + 1
    ).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes()
    ).padStart(2, "0")}`;
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !channel || !user) return;

    try {
      const messageData = {
        channel_id: channel.id,
        user_id: user.id,
        content: newMessage,
        username: user.username,
        created_at: new Date().toISOString(),
      };

      setNewMessage("");
      const textarea = document.querySelector("textarea");
      if (textarea) {
        textarea.style.height = "auto";
      }

      const response = await axios.post(`${API_BASE_URL}/send`, {
        channel_id: channel.id,
        user_id: user.id,
        content: newMessage,
      });

      if (response.data.success) {
        socketRef.current.emit("send-message", messageData);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("File quá lớn. Vui lòng chọn file nhỏ hơn 10MB");
      return;
    }

    if (file.type.startsWith("image/")) {
      setSelectedImage(file);
      handleUploadImage(file);
    } else if (file.type.startsWith("video/")) {
      handleUploadVideo(file);
    } else {
      alert("Chỉ hỗ trợ file ảnh hoặc video!");
    }
  };

  // Upload image
  const handleUploadImage = async (file) => {
    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/upload-image`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(progress);
          },
        }
      );

      const messageData = {
        channel_id: channel.id,
        user_id: user.id,
        content: `![image](${response.data.url})`,
        username: user.username,
        created_at: new Date().toISOString(),
      };

      const msgResponse = await axios.post(`${API_BASE_URL}/send`, {
        channel_id: channel.id,
        user_id: user.id,
        content: messageData.content,
      });

      if (msgResponse.data.success) {
        socketRef.current.emit("send-message", messageData);
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Error uploading image");
    } finally {
      setIsUploading(false);
      setSelectedImage(null);
      setUploadProgress(0);
    }
  };

  // Upload video
  const handleUploadVideo = async (file) => {
    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("video", file);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/upload-video`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(progress);
          },
        }
      );

      const messageData = {
        channel_id: channel.id,
        user_id: user.id,
        content: `![video](${response.data.url})`,
        username: user.username,
        created_at: new Date().toISOString(),
      };

      const msgResponse = await axios.post(`${API_BASE_URL}/send`, {
        channel_id: channel.id,
        user_id: user.id,
        content: messageData.content,
      });

      if (msgResponse.data.success) {
        socketRef.current.emit("send-message", messageData);
      }
    } catch (error) {
      console.error("Error uploading video:", error);
      alert("Error uploading video");
    } finally {
      setIsUploading(false);
      setSelectedImage(null);
      setUploadProgress(0);
    }
  };

  // Render message content
  const renderMessageContent = (content) => {
    const markdownImageRegex = /!\[image]\((.*?)\)/;
    const markdownImageMatch = content.match(markdownImageRegex);

    if (markdownImageMatch) {
      return (
        <div className="w-full max-w-full overflow-hidden">
          <img
            src={markdownImageMatch[1]}
            alt="Uploaded"
            className="w-full md:w-auto md:max-w-md h-auto max-h-96 rounded-lg cursor-pointer hover:opacity-90 transition-opacity object-contain"
            onClick={() => window.open(markdownImageMatch[1], "_blank")}
          />
        </div>
      );
    }

    const markdownVideoRegex = /!\[video]\((.*?)\)/;
    const markdownVideoMatch = content.match(markdownVideoRegex);

    if (markdownVideoMatch) {
      return (
        <div className="w-full max-w-full overflow-hidden">
          <video
            src={markdownVideoMatch[1]}
            controls
            playsInline
            webkit-playsinline="true"
            className="w-full md:w-auto md:max-w-md h-auto max-h-96 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            preload="metadata"
          >
            <source src={markdownVideoMatch[1]} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    const imageUrlRegex = /(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp))/i;
    const imageMatch = content.match(imageUrlRegex);

    if (imageMatch) {
      return (
        <div className="w-full max-w-full overflow-hidden">
          <img
            src={imageMatch[1]}
            alt="Uploaded"
            className="w-full md:w-auto md:max-w-md h-auto max-h-96 rounded-lg cursor-pointer hover:opacity-90 transition-opacity object-contain"
            onClick={() => window.open(imageMatch[1], "_blank")}
          />
        </div>
      );
    }

    const videoUrlRegex = /(https?:\/\/.*\.(?:mp4|webm|ogg))/i;
    const videoMatch = content.match(videoUrlRegex);

    if (videoMatch) {
      return (
        <div className="w-full max-w-full overflow-hidden">
          <video
            src={videoMatch[1]}
            controls
            playsInline
            webkit-playsinline="true"
            className="w-full md:w-auto md:max-w-md h-auto max-h-96 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            preload="metadata"
          >
            <source src={videoMatch[1]} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    const lines = content.split("\n");
    const urlRegex = /(https?:\/\/[^\s]+)/g;

    return (
      <div className="text-gray-300 whitespace-pre-line leading-relaxed">
        {lines.map((line, index) => (
          <div key={index} className="min-h-[1.5em]">
            {line.split(urlRegex).map((part, i) => {
              if (part.match(urlRegex)) {
                return (
                  <a
                    key={i}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 hover:underline"
                  >
                    {part}
                  </a>
                );
              }
              return part || "\u00A0";
            })}
          </div>
        ))}
      </div>
    );
  };

  // Handle paste
  const handlePaste = async (e) => {
    const items = e.clipboardData.items;
    let hasHandledMedia = false;

    for (let item of items) {
      if (item.type.indexOf("image") !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file.size > 10 * 1024 * 1024) {
          alert("File quá lớn. Vui lòng chọn file nhỏ hơn 10MB");
          return;
        }
        handleUploadImage(file);
        hasHandledMedia = true;
        break;
      } else if (item.type.indexOf("video") !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file.size > 10 * 1024 * 1024) {
          alert("File quá lớn. Vui lòng chọn file nhỏ hơn 10MB");
          return;
        }
        handleUploadVideo(file);
        hasHandledMedia = true;
        break;
      }
    }

    if (!hasHandledMedia) {
      const text = e.clipboardData.getData("text");
      e.preventDefault();
      document.execCommand("insertText", false, text);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (e.shiftKey) {
        return;
      } else {
        e.preventDefault();
        sendMessage();
      }
    }
  };

  if (!channel) {
    return (
      <div className="flex flex-col h-full bg-[#313338] flex-1 overflow-x-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 bg-[#36393F] border-b border-[#202225] fixed top-0 w-full z-10">
          <div className="flex items-center space-x-2">
            <button
              onClick={onBack}
              className="md:hidden text-gray-400 hover:text-white p-2 rounded hover:bg-[#40444B]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
          <button
            onClick={onToggleMemberList}
            className="text-gray-400 hover:text-white p-2 rounded hover:bg-[#40444B]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4 text-center mt-14">
          <p className="text-lg text-gray-300">{customMessage || "🔹 Chọn một kênh để trò chuyện!"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full md:h-screen bg-[#36393F] overflow-hidden md:relative fixed inset-0 touch-none overscroll-none">
      {isLoading && <LoadingScreen />}
      
      {/* Header - fixed */}
      <div className="flex-none flex items-center justify-between px-4 h-14 bg-[#36393F] border-b border-[#202225] z-10 touch-none">
        <div className="flex items-center space-x-2">
          <button
            onClick={onBack}
            className="md:hidden text-gray-400 hover:text-white p-2 rounded hover:bg-[#40444B]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <span className="text-white font-medium truncate">
            {channel ? `#${channel.name}` : "Chọn kênh"}
          </span>
        </div>
        <button
          onClick={onToggleMemberList}
          className="text-gray-400 hover:text-white p-2 rounded hover:bg-[#40444B] md:hidden"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
          </svg>
        </button>
      </div>

      {/* Messages container - scrollable */}
      <div
        ref={messageContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-4 w-full overscroll-contain
          [&::-webkit-scrollbar]:w-2
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:bg-[#202225]
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-thumb]:border-2
          [&::-webkit-scrollbar-thumb]:border-[#36393F]
          hover:[&::-webkit-scrollbar-thumb]:bg-[#2F3136]"
      >
        <div className="flex flex-col w-full">
          {messages.length === 0 && (
            <div className="flex items-center justify-center flex-1 text-gray-400">
              <p>Chưa có tin nhắn nào trong kênh này</p>
            </div>
          )}
          {messages.map((msg, index) => (
            <div
              key={msg.id || index}
              className={`flex items-start space-x-3 hover:bg-[#2e3035] rounded p-2 group w-full max-w-full ${
                msg.user_id === user.id ? "bg-[#32353b]" : ""
              }`}
            >
              <div
                className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-medium"
                style={{
                  backgroundColor: userColorMap[msg.username] || "#5865F2",
                }}
              >
                {msg.username.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1 w-full max-w-full">
                <div className="flex items-baseline">
                  <span
                    className="font-medium cursor-pointer hover:underline member-name"
                    style={{ color: userColorMap[msg.username] || "#ffffff" }}
                    onClick={(e) => handleMemberClick(msg.username, e)}
                  >
                    {msg.username}
                  </span>
                  <span className="ml-2 text-xs text-gray-400">
                    {msg.created_at}
                  </span>
                </div>
                {renderMessageContent(msg.content)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Message input - fixed */}
      <div className="flex-none p-4 bg-[#313338] border-t border-[#202225] w-full touch-none">
        <div
          className="flex items-start bg-[#383a40] rounded-lg p-2 max-w-full"
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.classList.add("border-2", "border-[#5865f2]");
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.classList.remove("border-2", "border-[#5865f2]");
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.classList.remove("border-2", "border-[#5865f2]");
            
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
              const file = files[0];
              
              if (file.size > 10 * 1024 * 1024) {
                alert("File quá lớn. Vui lòng chọn file nhỏ hơn 10MB");
                return;
              }

              if (file.type.startsWith('image/')) {
                setSelectedImage(file);
                handleUploadImage(file);
              } else if (file.type.startsWith('video/')) {
                handleUploadVideo(file);
              } else {
                alert("Chỉ hỗ trợ file ảnh hoặc video!");
              }
            }
          }}
        >
          <textarea
            className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none resize-none overflow-y-auto max-h-48 w-full"
            placeholder={
              isConnected ? "Nhập tin nhắn hoặc kéo thả file vào đây..." : "Đang kết nối lại..."
            }
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              const textarea = e.target;
              textarea.style.height = "auto";
              textarea.style.height = Math.min(textarea.scrollHeight, 12 * 24) + "px";
            }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            disabled={!isConnected}
            rows={1}
          />

          {/* Upload file button */}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*,video/*"
            onChange={handleFileSelect}
          />
          <button
            className="ml-2 p-2 text-gray-400 hover:text-white rounded transition-colors"
            onClick={() => fileInputRef.current?.click()}
            disabled={!isConnected || isUploading}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          <button
            className="ml-2 px-4 py-1.5 rounded bg-[#5865f2] text-white hover:bg-[#4752c4]"
            onClick={sendMessage}
            disabled={!isConnected}
          >
            Gửi
          </button>
        </div>

        {/* Upload progress */}
        {isUploading && (
          <div className="mt-2">
            <div className="w-full bg-[#202225] rounded-full h-2">
              <div
                className="bg-[#5865f2] h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Member info tooltip */}
      {memberInfo && (
        <div
          className="fixed bg-[#18191c] text-white rounded-md shadow-lg p-3 z-50 w-64"
          style={{
            top: tooltipPosition.y + 5,
            left: tooltipPosition.x,
            transform: window.innerWidth <= 768 ? 'none' : 'translateX(-50%)',
            maxWidth: window.innerWidth <= 768 ? 'calc(100vw - 32px)' : '16rem',
            right: window.innerWidth <= 768 ? '16px' : 'auto'
          }}
        >
          <div className="flex items-center space-x-3 mb-2">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-medium"
              style={{
                backgroundColor: userColorMap[memberInfo.username] || "#5865F2",
              }}
            >
              {memberInfo.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <div
                className="font-semibold"
                style={{
                  color: userColorMap[memberInfo.username] || "#ffffff",
                }}
              >
                {memberInfo.username}
              </div>
              <div className="text-xs text-gray-400">
                {memberInfo.is_owner ? "Chủ sở hữu" : "Thành viên"}
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-400 mt-2">
            <div className="flex justify-between">
              <span>Tham gia ngày:</span>
              <span>{memberInfo.joined_at}</span>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media (max-width: 768px) {
          body {
            overscroll-behavior: none;
            overflow: hidden;
            position: fixed;
            width: 100%;
            height: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default ChatWindow;
