import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../config/axios";

const Home = ({ setUser }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      navigate("/dashboard");
    }
  }, [setUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (isRegister) {
        await axiosInstance.post("/register", { username, password });
        console.log("Đăng ký thành công! Hãy đăng nhập.");
        setIsRegister(false);
      } else {
        const res = await axiosInstance.post("/login", { username, password });
        const { token, user } = res.data;
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        setUser(user);
        navigate("/dashboard");
      }
    } catch (error) {
      setError(error.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại!");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-96">
        <h2 className="text-2xl font-bold text-center mb-4">{isRegister ? "Đăng Ký" : "Đăng Nhập"}</h2>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <input
            className="p-3 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            type="text"
            placeholder="Tên đăng nhập"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            className="p-3 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            type="password"
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            className={`p-3 rounded font-bold transition duration-300 ${
              isRegister ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"
            }`}
            type="submit"
          >
            {isRegister ? "Đăng Ký" : "Đăng Nhập"}
          </button>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        </form>
        <p className="mt-4 text-center">
          {isRegister ? "Đã có tài khoản?" : "Chưa có tài khoản?"}{" "}
          <button
            className="text-blue-400 hover:underline"
            onClick={() => setIsRegister(!isRegister)}
          >
            {isRegister ? "Đăng nhập" : "Đăng ký"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Home;
