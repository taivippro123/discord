import { useState, useEffect } from "react";
import Router from "./router/Router";
import { UserColorProvider } from "./context/UserColorContext";
import LoadingScreen from "./components/LoadingScreen";

export default function App() {
  const [activeChannel, setActiveChannel] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading time for initial data fetch
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <UserColorProvider>
      <Router activeChannel={activeChannel} setActiveChannel={setActiveChannel} />
    </UserColorProvider>
  );
}
