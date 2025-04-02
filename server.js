const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const session = require("express-session");
const { createServer } = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const cloudinary = require("./cloudinary");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173", "https://frontend-theta-two-64.vercel.app"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ⚡ Cấu hình session
app.use(
  session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: { 
      secure: false,
      maxAge: 24 * 60 * 60 * 1000 // 24 giờ
    }
  })
);

// Middleware kiểm tra authentication
const checkAuth = (req, res, next) => {
  const userId = req.body.user_id || req.query.user_id || req.params.user_id;
  
  if (!userId) {
    return res.status(401).json({ message: "Bạn chưa đăng nhập" });
  }

  // Lưu user_id vào session
  req.session.user_id = userId;
  next();
};

const generateInviteCode = () => {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
};

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
};

let db;

const connectDB = () => {
  db = mysql.createConnection(dbConfig);

db.connect((err) => {
    if (err) {
      console.error("❌ Lỗi kết nối DB:", err.message);
      setTimeout(connectDB, 5000); // Thử lại sau 5s nếu lỗi
    } else {
      console.log("✅ Kết nối MySQL thành công!");
    }
  });

  db.on("error", (err) => {
    console.error("❌ Database error:", err.message);
    if (err.code === "PROTOCOL_CONNECTION_LOST") {
      connectDB(); // Reconnect nếu mất kết nối
    }
  });
};

connectDB();

// Cấu hình multer để lưu file tạm thời
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = "uploads/";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Chỉ chấp nhận file ảnh và video
    if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ hỗ trợ file ảnh hoặc video!"), false);
    }
  },
});

// API Đăng ký
app.post("/register", (req, res) => {
  const { username, password } = req.body;
  db.query("INSERT INTO users (username, password) VALUES (?, ?)", [username, password], (err) => {
    if (err) return res.status(500).json({ message: "Lỗi đăng ký" });
    res.json({ message: "Đăng ký thành công" });
  });
});

// API Đăng nhập
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  
  db.query(
    "SELECT * FROM users WHERE username = ? AND password = ?",
    [username, password],
    (err, results) => {
      if (err || results.length === 0) return res.status(400).json({ message: "Sai tài khoản hoặc mật khẩu" });

      req.session.user_id = results[0].id;
      res.json({ message: "Đăng nhập thành công", user: results[0] });
    }
  );
});

// API Tạo server (thêm middleware checkAuth)
app.post("/create-server", checkAuth, (req, res) => {
  const { name } = req.body;
  const user_id = req.session.user_id;

  if (!name) return res.status(400).json({ message: "Thiếu tên server" });

  const inviteCode = generateInviteCode();

  db.query(
    "INSERT INTO servers (name, invite_code, owner_id) VALUES (?, ?, ?)",
    [name, inviteCode, user_id],
    (err, result) => {
      if (err) {
        console.error("❌ Lỗi tạo server:", err);
        return res.status(500).json({ message: "Lỗi tạo server", error: err });
      }

      const server_id = result.insertId;

      db.query(
        "INSERT INTO server_members (server_id, user_id) VALUES (?, ?)",
        [server_id, user_id],
        (err) => {
          if (err) {
            console.error("❌ Lỗi thêm vào server_members:", err);
            return res.status(500).json({ message: "Lỗi thêm vào server_members", error: err });
          }

          res.json({ message: "Server đã được tạo", server_id, invite_code: inviteCode });
        }
      );
    }
  );
});

// API Lấy mã mời của server
app.get("/server-invite/:serverId", async (req, res) => {
  const { serverId } = req.params;

  try {
    const [rows] = await db.promise().query(
      "SELECT invite_code FROM servers WHERE id = ?",
      [serverId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Server không tồn tại" });
    }

    res.json({ invite_code: rows[0].invite_code });
  } catch (error) {
    console.error("❌ Lỗi truy vấn database:", error);
    res.status(500).json({ error: "Lỗi server" });
  }
});

// API Tham gia server
app.post("/join-server", checkAuth, (req, res) => {
  const { invite_code } = req.body;
  const user_id = req.session.user_id;

  if (!invite_code) return res.status(400).json({ message: "Thiếu mã mời" });

  db.query("SELECT id FROM servers WHERE invite_code = ?", [invite_code], (err, results) => {
    if (err) {
      console.error("❌ Lỗi kiểm tra invite_code:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Mã mời không hợp lệ" });
    }

    const server_id = results[0].id;

    db.query(
      "SELECT * FROM server_members WHERE server_id = ? AND user_id = ?",
      [server_id, user_id],
      (err, memberResults) => {
        if (err) {
          console.error("❌ Lỗi kiểm tra thành viên:", err);
          return res.status(500).json({ message: "Lỗi server" });
        }

        if (memberResults.length > 0) {
          return res.status(400).json({ message: "Bạn đã ở trong server này rồi" });
        }

        db.query(
          "INSERT INTO server_members (server_id, user_id) VALUES (?, ?)",
          [server_id, user_id],
          (err) => {
            if (err) {
              console.error("❌ Lỗi thêm user vào server_members:", err);
              return res.status(500).json({ message: "Lỗi khi tham gia server" });
            }

            res.json({ message: "Tham gia server thành công", server_id });
          }
        );
      }
    );
  });
});

// API Lấy danh sách server của user
app.get("/servers/:user_id", checkAuth, (req, res) => {
  const { user_id } = req.params;
  db.query(
    `SELECT servers.* FROM servers 
     JOIN server_members ON servers.id = server_members.server_id 
     WHERE server_members.user_id = ?`, 
    [user_id], 
    (err, results) => {
      if (err) return res.status(500).json({ message: "Lỗi lấy danh sách server" });
      res.json(results);
    }
  );
});

// API Tạo kênh chat
app.post("/create-channel", (req, res) => {
  const { name, server_id } = req.body;
  db.query("INSERT INTO channels (name, server_id) VALUES (?, ?)", [name, server_id], (err) => {
    if (err) return res.status(500).json({ message: "Lỗi tạo kênh" });
    res.json({ message: "Kênh đã được tạo" });
  });
});

// API Lấy danh sách kênh của server
app.get("/channels/:server_id", (req, res) => {
  const { server_id } = req.params;
  db.query("SELECT * FROM channels WHERE server_id = ?", [server_id], (err, results) => {
    if (err) return res.status(500).json({ message: "Lỗi lấy danh sách kênh" });
    res.json(results);
  });
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-channel", (channelId) => {
    socket.join(`channel-${channelId}`);
    console.log(`User joined channel: ${channelId}`);
  });

  socket.on("leave-channel", (channelId) => {
    socket.leave(`channel-${channelId}`);
    console.log(`User left channel: ${channelId}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Modify the send message API to emit socket event
app.post("/send", (req, res) => {
  const { channel_id, user_id, content } = req.body;
  db.query(
    "INSERT INTO messages (channel_id, user_id, content) VALUES (?, ?, ?)",
    [channel_id, user_id, content],
    (err, result) => {
    if (err) return res.status(500).json({ message: "Lỗi gửi tin nhắn" });
      
      // Get the inserted message with user info
      db.query(
        `SELECT messages.id, messages.content, messages.created_at, users.username 
         FROM messages 
         JOIN users ON messages.user_id = users.id 
         WHERE messages.id = ?`,
        [result.insertId],
        (err, results) => {
          if (err) return res.status(500).json({ message: "Lỗi lấy thông tin tin nhắn" });
          
          // Emit the new message to all users in the channel
          io.to(`channel-${channel_id}`).emit("new-message", results[0]);
          res.json({ message: "Tin nhắn đã gửi", data: results[0] });
        }
      );
    }
  );
});

// API Lấy tin nhắn của kênh
app.get("/messages/:channel_id", (req, res) => {
  const { channel_id } = req.params;
  db.query(
    `SELECT messages.id, messages.content, messages.created_at, users.username 
     FROM messages 
     JOIN users ON messages.user_id = users.id 
     WHERE messages.channel_id = ? 
     ORDER BY messages.created_at ASC`,
    [channel_id],
    (err, results) => {
      if (err) return res.status(500).json({ message: "Lỗi lấy tin nhắn" });
      res.json(results);
    }
  );
});

app.get("/ping", (req, res) => {
  res.send("Server is alive");
});

const keepAlive = () => {
  setInterval(() => {
    fetch("https://discord-hbu2.onrender.com/ping")
      .then(res => res.text())
      .then(data => console.log("✅ Keep-alive ping sent:", data))
      .catch(err => console.error("❌ Keep-alive failed:", err.message));
  }, 4 * 60 * 1000); // Gửi request mỗi 4 phút
};

keepAlive();

setInterval(() => {
  db.query("SELECT 1", (err) => {
    if (err) {
      console.error("❌ Database connection lost:", err.message);
    } else {
      console.log("✅ Keep-alive query sent to database");
    }
  });
}, 5 * 60 * 1000);


app.get("/server-members/:serverId", (req, res) => {
  const { serverId } = req.params;

  // Lấy thông tin chủ sở hữu của server
  const ownerQuery = "SELECT owner_id FROM servers WHERE id = ?";
  db.query(ownerQuery, [serverId], (err, ownerResult) => {
    if (err) {
      console.error("❌ Lỗi lấy thông tin server:", err);
      return res.status(500).json({ error: "Lỗi lấy thông tin server" });
    }

    if (ownerResult.length === 0) {
      return res.status(404).json({ error: "Server không tồn tại" });
    }

    const ownerId = ownerResult[0].owner_id;

    // Lấy danh sách thành viên
    const memberQuery = `
      SELECT 
        users.id, 
        users.username, 
        server_members.joined_at
      FROM server_members
      JOIN users ON server_members.user_id = users.id
      WHERE server_members.server_id = ?
    `;

    db.query(memberQuery, [serverId], (err, memberResults) => {
      if (err) {
        console.error("❌ Lỗi lấy danh sách thành viên:", err);
        return res.status(500).json({ error: "Lỗi lấy danh sách thành viên" });
      }

      // Định dạng dữ liệu
      const members = memberResults.map((member) => ({
        id: member.id,
        username: member.username,
        joined_at: member.joined_at
          ? new Date(member.joined_at).toISOString().split("T")[0]
          : "Không xác định",
        is_owner: member.id === ownerId,
      }));

      res.json(members);
    });
  });
});

// API Upload ảnh lên Cloudinary
app.post("/upload-image", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Không có file nào được upload" });
  }

  try {
    // Upload file lên Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "discord-clone/chat",
    });

    // Xóa file tạm sau khi upload
    fs.unlinkSync(req.file.path);

    res.json({
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (error) {
    console.error("❌ Lỗi upload ảnh:", error);
    res.status(500).json({ message: "Lỗi upload ảnh" });
  }
});

// API Upload video
app.post("/upload-video", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Không tìm thấy file video" });
    }

    // Upload video lên Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: "video", // Chỉ định đây là video
      folder: "videos", // Lưu trong folder videos
    });

    // Xóa file tạm sau khi upload
    fs.unlinkSync(req.file.path);

    res.json({
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (error) {
    console.error("❌ Lỗi upload video:", error);
    // Xóa file tạm nếu có lỗi
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: "Lỗi khi upload video" });
  }
});

// API Xóa video
app.delete("/delete-video", async (req, res) => {
  try {
    const { public_id } = req.body;
    if (!public_id) {
      return res.status(400).json({ message: "Thiếu public_id" });
    }

    // Xóa video từ Cloudinary
    await cloudinary.uploader.destroy(public_id, {
      resource_type: "video",
    });

    res.json({ message: "Xóa video thành công" });
  } catch (error) {
    console.error("❌ Lỗi xóa video:", error);
    res.status(500).json({ message: "Lỗi khi xóa video" });
  }
});

// API Đăng xuất
app.post("/logout", (req, res) => {
  try {
    // Xóa session nếu có
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error("❌ Lỗi xóa session:", err);
        }
      });
    }
    
    // Xóa cookie session
    res.clearCookie("connect.sid");
    
    // Xóa cookie token nếu có
    res.clearCookie("token");
    
    res.json({ message: "Đăng xuất thành công" });
  } catch (error) {
    console.error("❌ Lỗi đăng xuất:", error);
    res.status(500).json({ message: "Lỗi đăng xuất" });
  }
});

const PORT = 5000;
httpServer.listen(PORT, () => console.log(`🚀 Server chạy tại http://localhost:${PORT}`));
