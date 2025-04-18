import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../config";
import Sidebar from "./Sidebar";
import ChannelList from "./ChannelList";
import ChatWindow from "./ChatWindow";
import MemberList from "./MemberList";

export const getTestData = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/test-db`);
    return await response.json();
  } catch (error) {
    console.error("❌ Lỗi gọi API:", error);
    return { error: "Lỗi kết nối API" };
  }
};

const Dashboard = ({ user }) => {
  const [server, setServer] = useState(null);
  const [activeChannel, setActiveChannel] = useState(null);
  const [channels, setChannels] = useState([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showChannelList, setShowChannelList] = useState(true);
  const [showMemberList, setShowMemberList] = useState(false);
  const [showServerList, setShowServerList] = useState(false);
  const [pinnedChannel, setPinnedChannel] = useState(null);
  const [showChatWindow, setShowChatWindow] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }

    axios.get(`${API_BASE_URL}/servers/${user.id}`)
      .then((res) => {
        if (res.data.length > 0) {
          setServer(res.data[0]);
          // Load channels cho server đầu tiên nhưng không mở chat window
          axios.get(`${API_BASE_URL}/channels/${res.data[0].id}`)
            .then((channelRes) => {
              setChannels(channelRes.data);
              if (channelRes.data.length > 0) {
                setActiveChannel(channelRes.data[0]);
                setPinnedChannel(channelRes.data[0]);
              }
            })
            .catch(() => console.error("Lỗi tải channels"));
        }
      })
      .catch(() => console.error("Lỗi tải server"));
  }, [user, navigate]);

  // Load channels khi server thay đổi
  useEffect(() => {
    if (!server) {
      setChannels([]);
      setActiveChannel(null);
      setPinnedChannel(null);
      return;
    }

    axios.get(`${API_BASE_URL}/channels/${server.id}`)
      .then((res) => {
        setChannels(res.data);
        if (res.data.length > 0) {
          setActiveChannel(res.data[0]);
          setPinnedChannel(res.data[0]);
        } else {
          setActiveChannel(null);
          setPinnedChannel(null);
        }
      })
      .catch(() => console.error("Lỗi tải channels"));
  }, [server]);

  const handleServerChange = (newServer) => {
    setServer(newServer);
    setPinnedChannel(null);
    setShowChatWindow(false); // Đảm bảo chat window đóng khi đổi server
  };

  const handleBackToChannels = () => {
    setShowSidebar(true);
    setShowChannelList(true);
    setShowMemberList(false); // Đóng member list khi mở server/channel list
  };

  const handleToggleMemberList = () => {
    setShowMemberList(!showMemberList);
    // Đóng server/channel list khi mở member list
    if (!showMemberList) {
      setShowSidebar(false);
      setShowChannelList(false);
    }
  };

  const handleChannelSelect = (channel) => {
    setActiveChannel(channel);
    setPinnedChannel(channel);
    setShowChatWindow(true);
    setShowSidebar(false);
    setShowChannelList(false);
    setShowMemberList(false); // Đóng member list khi chọn channel
  };

  return (
    <>
      <div className="flex h-screen bg-[#36393F] text-white overflow-hidden">
        {/* Overlay for mobile when sidebar is open */}
        <div 
          className={`md:hidden fixed inset-0 bg-black/50 z-10 transition-opacity duration-300
            ${showSidebar ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          onClick={() => {
            setShowSidebar(false);
            setShowChannelList(false);
          }}
        />

        {/* Overlay for mobile when member list is open */}
        <div 
          className={`md:hidden fixed inset-0 bg-black/50 z-10 transition-opacity duration-300
            ${showMemberList ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          onClick={() => setShowMemberList(false)}
        />

        {/* Sidebar và Channel list container - fixed trên mobile, static trên desktop */}
        <div 
          className={`md:static md:translate-x-0 md:flex
            ${showSidebar ? 'translate-x-0' : '-translate-x-full'} 
            transition-transform duration-300 ease-in-out
            fixed top-0 left-0 bottom-0 z-20 flex bg-[#2F3136]`}
        >
          {/* Sidebar */}
          <div className="flex-shrink-0">
            <Sidebar user={user} setActiveServer={handleServerChange} />
          </div>

          {/* Channel list */}
          {server && (
            <div className="flex-shrink-0 w-60">
              <ChannelList server={server} onSelectChannel={handleChannelSelect} />
            </div>
          )}
        </div>

        {/* Main chat area - full width trên mobile, thu hẹp trên desktop */}
        <div className="flex-1 flex min-w-0 relative">
          {server ? (
            channels.length > 0 ? (
              <div className="w-full">
                <ChatWindow 
                  channel={activeChannel} 
                  user={user}
                  onBack={handleBackToChannels}
                  onToggleMemberList={handleToggleMemberList}
                />
              </div>
            ) : (
              <div className="w-full">
                <ChatWindow 
                  channel={null}
                  user={user}
                  onBack={handleBackToChannels}
                  onToggleMemberList={handleToggleMemberList}
                  customMessage="🔹 Tạo một kênh để trò chuyện!"
                />
              </div>
            )
          ) : (
            <div className="w-full">
              <ChatWindow 
                channel={null}
                user={user}
                onBack={handleBackToChannels}
                onToggleMemberList={handleToggleMemberList}
                customMessage="Không có server nào. Hãy tham gia hoặc tạo server mới!"
              />
            </div>
          )}

          {/* Member list overlay - fixed trên mobile, static trên desktop */}
          <div 
            className={`md:static md:translate-x-0 md:w-60 md:top-0
              ${showMemberList ? 'translate-x-0' : 'translate-x-full'} 
              transition-transform duration-300 ease-in-out
              fixed top-14 right-0 bottom-0 w-60 bg-[#2F3136] z-20`}
          >
            <MemberList server={server} />
          </div>
        </div>
      </div>
      <div id="modal-root" className="fixed inset-0 pointer-events-none">
        {/* Modals sẽ được portal vào đây */}
      </div>
    </>
  );
};

export default Dashboard;