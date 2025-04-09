import { useEffect, useState, useRef } from "react";
import axios from "axios";
import ReactDOM from "react-dom";
import API_BASE_URL from "../config";
import { useNavigate } from "react-router-dom";

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

const Sidebar = ({ user, setActiveServer }) => {
  const [servers, setServers] = useState([]);
  const [modalType, setModalType] = useState(null);
  const [newServerName, setNewServerName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [activeServerId, setActiveServerId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // Tạo axios instance với headers mặc định
  const axiosInstance = axios.create({
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });

  useEffect(() => {
    if (!user) return;

    axiosInstance
      .get(`${API_BASE_URL}/servers/${user.id}`)
      .then((res) => {
        setServers(res.data);
        // Nếu có servers và chưa có server nào được chọn, chọn server đầu tiên
        if (res.data.length > 0 && !activeServerId) {
          setActiveServerId(res.data[0].id);
          setActiveServer(res.data[0]);
        }
      })
      .catch(() => alert("Lỗi tải danh sách server"));
  }, [user]);

  // Thêm useEffect để theo dõi khi server được chọn từ bên ngoài
  useEffect(() => {
    const currentServer = servers.find(s => s.id === activeServerId);
    if (currentServer) {
      setActiveServer(currentServer);
    }
  }, [activeServerId]);

  const handleCreateServer = async () => {
    if (!newServerName.trim()) return alert("Nhập tên server!");

    try {
      const res = await axiosInstance.post(
        `${API_BASE_URL}/create-server`,
        { name: newServerName, user_id: user.id }
      );

      const newServer = { id: res.data.server_id, name: newServerName };
      setServers((prev) => [...prev, newServer]);
      setActiveServerId(newServer.id);
      setActiveServer(newServer);
      setNewServerName("");
      setModalType(null);
    } catch (error) {
      alert("Lỗi khi tạo server: " + (error.response?.data?.message || "Không rõ lỗi"));
    }
  };

  const handleJoinServer = async () => {
    if (!inviteCode.trim()) return alert("Nhập mã mời!");
  
    try {
      const joinRes = await axiosInstance.post(
        `${API_BASE_URL}/join-server`,
        { invite_code: inviteCode, user_id: user.id }
      );
  
      const updatedServersRes = await axiosInstance.get(`${API_BASE_URL}/servers/${user.id}`);
      setServers(updatedServersRes.data);
      
      // Chọn server mới tham gia
      const newServerId = joinRes.data.server_id;
      const joinedServer = updatedServersRes.data.find(s => s.id === newServerId);
      if (joinedServer) {
        setActiveServerId(joinedServer.id);
        setActiveServer(joinedServer);
      }
  
      setInviteCode("");
      setModalType(null);
    } catch (error) {
      alert("Lỗi khi tham gia server: " + (error.response?.data?.message || "Không rõ lỗi"));
    }
  };

  const handleServerClick = (server) => {
    setActiveServerId(server.id);
    setActiveServer(server);
  };

  // Xử lý đăng xuất
  const handleLogout = async () => {
    try {
      // Gọi API đăng xuất
      await axiosInstance.post(`${API_BASE_URL}/logout`);
      
      // Xóa token và user khỏi localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Xóa các state liên quan
      setServers([]);
      setActiveServerId(null);
      setActiveServer(null);
      
      // Refresh trang một lần nhanh
      window.location.reload();
      
      // Sau khi refresh, chuyển hướng về trang login
      setTimeout(() => {
        navigate("/dashboard");
      }, 100);
    } catch (error) {
      console.error("❌ Lỗi đăng xuất:", error);
      // Nếu có lỗi, vẫn xóa token và user, sau đó chuyển về trang login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.reload();
      setTimeout(() => {
        navigate("/dashboard");
      }, 10);
    }
  };

  const renderModal = () => {
    switch (modalType) {
      case "select":
        return (
          <Modal onClose={() => setModalType(null)}>
            <div className="bg-[#313338]/90 backdrop-blur-md p-8 rounded-xl w-96 text-white shadow-2xl border border-white/10 transform transition-all duration-200">
              <h3 className="text-xl font-bold mb-6 text-center">Bạn muốn làm gì?</h3>
              <div className="flex flex-col space-y-4">
                <button
                  className="w-full px-6 py-3 bg-blue-600/90 backdrop-blur-sm rounded-lg hover:bg-blue-700/90 transition-colors duration-200 font-medium"
                  onClick={() => setModalType("create")}
                >
                  ✨ Tạo Server Mới
                </button>
                <button
                  className="w-full px-6 py-3 bg-green-600/90 backdrop-blur-sm rounded-lg hover:bg-green-700/90 transition-colors duration-200 font-medium"
                  onClick={() => setModalType("join")}
                >
                  🔑 Nhập Mã Mời
                </button>
              </div>
              <button
                className="mt-6 w-full px-6 py-3 bg-gray-600/80 backdrop-blur-sm rounded-lg hover:bg-gray-700/80 transition-colors duration-200 font-medium"
                onClick={() => setModalType(null)}
              >
                Hủy
              </button>
            </div>
          </Modal>
        );

      case "create":
        return (
          <Modal onClose={() => setModalType("select")}>
            <div className="bg-[#313338]/90 backdrop-blur-md p-8 rounded-xl w-96 text-white shadow-2xl border border-white/10">
              <h3 className="text-xl font-bold mb-6 text-center">Tạo Server Mới</h3>
              <input
                type="text"
                className="w-full p-3 mb-6 bg-[#1e1f22]/90 backdrop-blur-sm rounded-lg outline-none border border-white/10 focus:border-blue-500/50 transition-colors duration-200"
                placeholder="Nhập tên server..."
                value={newServerName}
                onChange={(e) => setNewServerName(e.target.value)}
              />
              <div className="flex justify-end space-x-3">
                <button 
                  className="px-6 py-3 bg-gray-600/80 backdrop-blur-sm rounded-lg hover:bg-gray-700/80 transition-colors duration-200 font-medium" 
                  onClick={() => setModalType("select")}
                >
                  Quay lại
                </button>
                <button 
                  className="px-6 py-3 bg-blue-600/90 backdrop-blur-sm rounded-lg hover:bg-blue-700/90 transition-colors duration-200 font-medium" 
                  onClick={handleCreateServer}
                >
                  Tạo Server
                </button>
              </div>
            </div>
          </Modal>
        );

      case "join":
        return (
          <Modal onClose={() => setModalType("select")}>
            <div className="bg-[#313338]/90 backdrop-blur-md p-8 rounded-xl w-96 text-white shadow-2xl border border-white/10">
              <h3 className="text-xl font-bold mb-6 text-center">Nhập Mã Mời</h3>
              <input
                type="text"
                className="w-full p-3 mb-6 bg-[#1e1f22]/90 backdrop-blur-sm rounded-lg outline-none border border-white/10 focus:border-green-500/50 transition-colors duration-200"
                placeholder="Nhập mã mời..."
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
              />
              <div className="flex justify-end space-x-3">
                <button 
                  className="px-6 py-3 bg-gray-600/80 backdrop-blur-sm rounded-lg hover:bg-gray-700/80 transition-colors duration-200 font-medium" 
                  onClick={() => setModalType("select")}
                >
                  Quay lại
                </button>
                <button 
                  className="px-6 py-3 bg-green-600/90 backdrop-blur-sm rounded-lg hover:bg-green-700/90 transition-colors duration-200 font-medium" 
                  onClick={handleJoinServer}
                >
                  Tham gia
                </button>
              </div>
            </div>
          </Modal>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-[72px] h-full bg-[#1e1f22] flex flex-col items-center py-4 space-y-4">
      <button
        className="w-12 h-12 bg-[#313338] text-white text-2xl font-bold rounded-full flex items-center justify-center hover:bg-green-500 transition-all"
        onClick={() => setModalType("select")}
      >
        +
      </button>

      {/* Server list với scrollbar tùy chỉnh */}
      <div className="flex-1 w-full overflow-y-auto px-2 pt-2 space-y-2 custom-scrollbar">
        <div className="flex flex-col items-center">
          {servers.map((server) => (
            <div
              key={server.id}
              className={`relative w-12 h-12 mb-2 bg-[#313338] text-white font-bold text-xl rounded-full flex items-center justify-center cursor-pointer transition-all group ${
                activeServerId === server.id 
                ? "bg-[#5865F2] rounded-2xl shadow-lg ring-2 ring-[#5865F2]" 
                : "hover:bg-[#5865F2] hover:rounded-2xl"
              }`}
              onClick={() => handleServerClick(server)}
            >
              {/* Server indicator */}
              <div className={`absolute -left-2 w-1.5 h-8 rounded-r-full transition-all ${
                activeServerId === server.id 
                ? "bg-white" 
                : "bg-white scale-0 group-hover:scale-50"
              }`} />
              
              {/* Server name tooltip */}
              <div className="absolute left-full ml-4 px-2 py-1 bg-black rounded-md text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50">
                {server.name}
              </div>
              
              {server.name[0].toUpperCase()}
            </div>
          ))}
        </div>
      </div>


      {/* Logout button */}
      <div className="relative group cursor-pointer mt-auto mb-4">
        <div
          className="w-12 h-12 rounded-[24px] bg-[#36393F] flex items-center justify-center text-[#DCDDDE] hover:rounded-[16px] transition-all duration-200 ease-out group-hover:bg-[#ED4245]"
          onClick={handleLogout}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        </div>
      </div>

      {renderModal()}

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

export default Sidebar;
