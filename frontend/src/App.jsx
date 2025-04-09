import { useState } from "react";
import Router from "./router/Router";
import { UserColorProvider } from "./context/UserColorContext";

export default function App() {
  const [activeChannel, setActiveChannel] = useState(null);

  return (
    <UserColorProvider>
      <Router activeChannel={activeChannel} setActiveChannel={setActiveChannel} />
    </UserColorProvider>
  );
}
