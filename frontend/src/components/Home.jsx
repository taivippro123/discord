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
    <div className="min-h-screen w-full bg-[#5865F2] flex items-center justify-center p-4">
      <div className="bg-[#313338] rounded-md shadow-xl w-full max-w-[480px] p-8">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-white mb-2">
            {isRegister ? "Tạo tài khoản" : "Chào mừng trở lại!"}
          </h1>
          <p className="text-[#B5BAC1] text-base">
            {isRegister ? "Rất vui được gặp bạn!" : "Rất vui khi được gặp lại bạn!"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#B5BAC1] uppercase">
              {isRegister ? "TÊN ĐĂNG NHẬP" : "TÊN ĐĂNG NHẬP HOẶC EMAIL"}
              {error && <span className="text-[#FA777C] ml-1">- {error}</span>}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-3 py-2 bg-[#1E1F22] text-white rounded-[3px] border border-[#1E1F22] focus:border-[#00A8FC] focus:outline-none transition-colors placeholder:text-[#87898C]"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#B5BAC1] uppercase">
              MẬT KHẨU
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 bg-[#1E1F22] text-white rounded-[3px] border border-[#1E1F22] focus:border-[#00A8FC] focus:outline-none transition-colors placeholder:text-[#87898C]"
            />
          </div>

          {!isRegister && (
            <button type="button" className="text-[#00A8FC] text-sm hover:underline">
              Quên mật khẩu?
            </button>
          )}

          <button
            type="submit"
            className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white py-3 rounded-[3px] transition-colors font-medium text-base"
          >
            {isRegister ? "Tiếp tục" : "Đăng nhập"}
          </button>

          <p className="text-[#949BA4] text-sm">
            {isRegister ? "Đã có tài khoản?" : "Cần một tài khoản?"}{" "}
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-[#00A8FC] hover:underline"
            >
              {isRegister ? "Đăng nhập" : "Đăng ký"}
            </button>
          </p>
        </form>

        {!isRegister && (
          <div className="mt-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#3F4147]"></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
