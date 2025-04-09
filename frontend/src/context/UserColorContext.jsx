import React, { createContext, useState, useContext, useEffect } from 'react';

const userColors = [
  "#1abc9c", "#2ecc71", "#3498db", "#9b59b6", "#e91e63",
  "#f1c40f", "#e67e22", "#e74c3c", "#95a5a6", "#607d8b"
];

const UserColorContext = createContext(null);

export const UserColorProvider = ({ children }) => {
  const [userColorMap, setUserColorMap] = useState(() => {
    const savedColors = localStorage.getItem('userColors');
    return savedColors ? JSON.parse(savedColors) : {};
  });

  // Lưu màu vào localStorage khi có thay đổi
  useEffect(() => {
    localStorage.setItem('userColors', JSON.stringify(userColorMap));
  }, [userColorMap]);

  const setUserColors = (users) => {
    const colorMap = { ...userColorMap };
    let hasNewColors = false;

    users.forEach(user => {
      if (!colorMap[user.username]) {
        hasNewColors = true;
        colorMap[user.username] = userColors[Object.keys(colorMap).length % userColors.length];
      }
    });

    if (hasNewColors) {
      setUserColorMap(colorMap);
    }
  };

  const value = {
    userColorMap,
    setUserColors
  };

  return (
    <UserColorContext.Provider value={value}>
      {children}
    </UserColorContext.Provider>
  );
};

export const useUserColors = () => {
  const context = useContext(UserColorContext);
  if (!context) {
    throw new Error('useUserColors must be used within a UserColorProvider');
  }
  return context;
}; 