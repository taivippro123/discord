import React, { useState, useEffect } from "react";
import axios from "axios";
import API_BASE_URL from "../config";
import { useUserColors } from "../context/UserColorContext";

const MemberList = ({ server }) => {
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const { userColorMap } = useUserColors();

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/server-members/${server.id}`);
        setMembers(response.data);
      } catch (error) {
        console.error("Error fetching members:", error);
      }
    };

    if (server) {
      fetchMembers();
    }
  }, [server]);

  const handleMemberClick = (member, event) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width + 10,
      y: rect.top
    });
    setSelectedMember(member);
  };

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.member-item')) {
        setSelectedMember(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="bg-[#2f3136] h-full p-4">
      <h3 className="text-gray-400 uppercase text-xs font-semibold mb-4">
        Tổng thành viên — {members.length}
      </h3>
      
      {/* Owner section */}
      <div className="mb-4">
        <h4 className="text-[#72767d] text-xs font-semibold mb-2">CHỦ SỞ HỮU</h4>
        {members
          .filter(member => member.is_owner)
          .map(member => (
            <div
              key={member.id}
              className="flex items-center space-x-2 px-2 py-1.5 rounded hover:bg-[#36393f] cursor-pointer member-item relative"
              onClick={(e) => handleMemberClick(member, e)}
            >
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                style={{ backgroundColor: userColorMap[member.username] }}
              >
                {member.username.charAt(0).toUpperCase()}
              </div>
              <span className="text-white font-medium" style={{ color: userColorMap[member.username] }}>
                {member.username}
              </span>
            </div>
          ))}
      </div>

      {/* Members section */}
      <div>
        <h4 className="text-[#72767d] text-xs font-semibold mb-2">THÀNH VIÊN</h4>
        {members
          .filter(member => !member.is_owner)
          .map(member => (
            <div
              key={member.id}
              className="flex items-center space-x-2 px-2 py-1.5 rounded hover:bg-[#36393f] cursor-pointer member-item relative"
              onClick={(e) => handleMemberClick(member, e)}
            >
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                style={{ backgroundColor: userColorMap[member.username] }}
              >
                {member.username.charAt(0).toUpperCase()}
              </div>
              <span className="text-white font-medium" style={{ color: userColorMap[member.username] }}>
                {member.username}
              </span>
            </div>
          ))}
      </div>

      {/* Member info tooltip */}
      {selectedMember && (
        <div 
          className="fixed bg-[#18191c] text-white rounded-md shadow-lg p-3 z-50 w-64"
          style={{
            top: tooltipPosition.y,
            left: tooltipPosition.x
          }}
        >
          <div className="flex items-center space-x-3 mb-2">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-medium"
              style={{ backgroundColor: userColorMap[selectedMember.username] }}
            >
              {selectedMember.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-semibold" style={{ color: userColorMap[selectedMember.username] }}>
                {selectedMember.username}
              </div>
              <div className="text-xs text-gray-400">
                {selectedMember.is_owner ? 'Chủ sở hữu' : 'Thành viên'}
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-400 mt-2">
            <div className="flex justify-between">
              <span>Tham gia ngày:</span>
              <span>{selectedMember.joined_at}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberList;
