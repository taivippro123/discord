import { useEffect, useState } from "react";
import axios from "axios";
import ReactDOM from "react-dom";
import API_BASE_URL from "../config";

export const getTestData = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/test-db`);
    return await response.json();
  } catch (error) {
    console.error("❌ Lỗi gọi API:", error);
    return { error: "Lỗi kết nối API" };
  }
};

const Modal = ({ children, onClose }) => {
  return ReactDOM.createPortal(
    <div 
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn" 
      onClick={onClose}
    >
      <div 
        className="relative transform transition-all duration-200 ease-out animate-scaleIn" 
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

const ChannelList = ({ server, onSelectChannel }) => {
  const [channels, setChannels] = useState([]);
  const [inviteCode, setInviteCode] = useState(null);
  const [showInvite, setShowInvite] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [activeChannel, setActiveChannel] = useState(null);

  useEffect(() => {
    // Reset active channel when server changes
    setActiveChannel(null);
    
    if (!server) return;

    axios
      .get(`${API_BASE_URL}/channels/${server.id}`)
      .then((res) => {
        setChannels(res.data);
        // Luôn chọn channel đầu tiên khi đổi server
        if (res.data.length > 0) {
          const firstChannel = res.data[0];
          setActiveChannel(firstChannel);
          onSelectChannel(firstChannel);
        }
      })
      .catch(() => console.log("Lỗi tải danh sách kênh"));

    // Gọi API lấy mã mời không cần token
    axios
      .get(`${API_BASE_URL}/server-invite/${server.id}`, { withCredentials: false })
      .then((res) => setInviteCode(res.data.invite_code))
      .catch(() => console.log("Lỗi lấy mã mời"));
  }, [server]);

  const handleChannelSelect = (channel) => {
    setActiveChannel(channel);
    onSelectChannel(channel);
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) {
      alert("Vui lòng nhập tên kênh!");
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/create-channel`, {
        name: newChannelName,
        server_id: server.id
      });

      // Refresh danh sách kênh
      const res = await axios.get(`${API_BASE_URL}/channels/${server.id}`);
      setChannels(res.data);
      
      // Reset form và đóng modal
      setNewChannelName("");
      setShowCreateChannel(false);
    } catch (error) {
      alert("Lỗi tạo kênh: " + (error.response?.data?.message || "Không rõ lỗi"));
    }
  };

  return (
    <div className="h-full bg-[#2F3136] flex flex-col">
      {/* Header Server */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-[#202225]">
        <h2 className="text-base font-semibold text-white truncate flex-1">
          {server?.name || "Chưa có server!"}
        </h2>

        {/* Nút hiển thị mã mời */}
        {inviteCode && (
          <div className="relative ml-2 flex-shrink-0">
            <button
              className="bg-[#1E1F22] text-gray-300 px-2 py-1 rounded text-sm hover:bg-[#292B2F]"
              onClick={() => setShowInvite(!showInvite)}
            >
              🔗
            </button>
          </div>
        )}
      </div>

      {/* Hiển thị mã mời khi bấm nút */}
      {showInvite && inviteCode && (
        <div className="mx-4 mt-2 text-center text-gray-300 bg-[#202225] p-2 rounded">
          <p className="text-sm">Mã mời:</p>
          <p className="font-mono font-bold text-white break-all">{inviteCode}</p>
        </div>
      )}

      {/* Header Channels với nút tạo kênh */}
      <div className="flex items-center justify-between px-4 py-2">
        <h3 className="text-xs font-semibold text-gray-400 uppercase">Kênh Chat</h3>
        <button
          className="text-gray-400 hover:text-white text-xl w-6 h-6 flex items-center justify-center rounded hover:bg-[#40444B]"
          onClick={() => setShowCreateChannel(true)}
        >
          +
        </button>
      </div>

      {/* Danh sách kênh với scrollbar tùy chỉnh */}
      <div className="flex-1 overflow-y-auto px-2 custom-scrollbar">
        <ul className="space-y-0.5">
          {channels.map((channel) => (
            <li
              key={channel.id}
              className={`group px-2 py-1.5 rounded text-sm cursor-pointer transition-colors ${
                activeChannel?.id === channel.id 
                ? "bg-[#404249] text-white" 
                : "text-gray-400 hover:bg-[#36393F] hover:text-gray-300"
              }`}
              onClick={() => handleChannelSelect(channel)}
            >
              <div className="flex items-center">
                <span className="text-lg mr-1.5">#</span>
                <span className="truncate">{channel.name}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Modal tạo kênh mới */}
      {showCreateChannel && (
        <Modal onClose={() => setShowCreateChannel(false)}>
          <div className="bg-[#313338]/90 backdrop-blur-md p-6 rounded-xl w-full max-w-sm mx-4 text-white shadow-2xl border border-white/10">
            <h3 className="text-lg font-bold mb-4">Tạo Kênh Mới</h3>
            <input
              type="text"
              className="w-full p-2 mb-4 bg-[#1e1f22]/90 backdrop-blur-sm rounded-lg outline-none border border-white/10 focus:border-blue-500/50 transition-colors duration-200"
              placeholder="Nhập tên kênh..."
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
            />
            <div className="flex justify-end space-x-2">
              <button
                className="px-4 py-2 bg-gray-600/80 backdrop-blur-sm rounded-lg hover:bg-gray-700/80 transition-colors duration-200"
                onClick={() => setShowCreateChannel(false)}
              >
                Hủy
              </button>
              <button
                className="px-4 py-2 bg-blue-600/90 backdrop-blur-sm rounded-lg hover:bg-blue-700/90 transition-colors duration-200"
                onClick={handleCreateChannel}
              >
                Tạo Kênh
              </button>
            </div>
          </div>
        </Modal>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #202225;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #2f3136;
        }
      `}</style>
    </div>
  );
};

export default ChannelList;
