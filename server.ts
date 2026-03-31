import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(process.cwd(), "data.json");

const hashPassword = (password: string) => {
  return crypto.createHash("sha256").update(password).digest("hex");
};

const generateRecoveryKey = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Base32 alphabet (removed ambiguous O, 0, I, 1, L)
  let key = "";
  const bytes = crypto.randomBytes(16);
  for (let i = 0; i < 16; i++) {
    key += chars[bytes[i] % chars.length];
    if (i > 0 && (i + 1) % 4 === 0 && i < 15) {
      key += "-";
    }
  }
  return key; // Format: XXXX-XXXX-XXXX-XXXX
};

const cleanKey = (key: string) => key.replace(/[^A-Z0-9]/g, "").toUpperCase();

// Initialize data file if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ 
    passwords: [], 
    twoFactor: { enabled: false, secret: "" },
    biometrics: { enabled: false, credentials: [] },
    auth: {
      masterPasswordHash: hashPassword("admin123"),
      recoveryKey: generateRecoveryKey()
    }
  }));
} else {
  // Migration for existing data.json
  const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  if (!data.auth) {
    data.auth = {
      masterPasswordHash: hashPassword("admin123"),
      recoveryKey: generateRecoveryKey()
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  }
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;

  const broadcast = (data: any) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  };

  app.use(express.json());

  // Auth Routes
  app.get("/api/auth/status", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    res.json({ 
      hasRecoveryKey: !!data.auth.recoveryKey,
      isDefault: data.auth.masterPasswordHash === hashPassword("admin123")
    });
  });

  app.get("/api/auth/recovery-key", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    res.json({ recoveryKey: data.auth.recoveryKey });
  });

  app.post("/api/auth/login", (req, res) => {
    const { password } = req.body;
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    if (hashPassword(password) === data.auth.masterPasswordHash) {
      res.json({ success: true });
    } else {
      res.status(401).json({ error: "Invalid master password" });
    }
  });

  app.post("/api/auth/reset", (req, res) => {
    const { recoveryKey, newPassword } = req.body;
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    if (recoveryKey && cleanKey(recoveryKey) === cleanKey(data.auth.recoveryKey)) {
      data.auth.masterPasswordHash = hashPassword(newPassword);
      data.auth.recoveryKey = generateRecoveryKey(); // Rotate recovery key
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
      res.json({ success: true, newRecoveryKey: data.auth.recoveryKey });
    } else {
      res.status(401).json({ error: "Invalid recovery key" });
    }
  });

  app.post("/api/auth/change", (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    if (hashPassword(oldPassword) === data.auth.masterPasswordHash) {
      data.auth.masterPasswordHash = hashPassword(newPassword);
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
      res.json({ success: true });
    } else {
      res.status(401).json({ error: "Invalid current password" });
    }
  });

  // API Routes
  app.get("/api/passwords", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    res.json(data.passwords);
  });

  // Biometric Routes
  app.get("/api/biometrics/status", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    res.json({ enabled: data.biometrics?.enabled || false });
  });

  app.post("/api/biometrics/register", (req, res) => {
    const { credential } = req.body;
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    
    if (!data.biometrics) data.biometrics = { enabled: false, credentials: [] };
    
    data.biometrics.credentials.push(credential);
    data.biometrics.enabled = true;
    
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true });
  });

  app.post("/api/biometrics/verify", (req, res) => {
    const { id } = req.body;
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    
    const credential = data.biometrics?.credentials.find((c: any) => c.id === id);
    
    if (credential) {
      res.json({ success: true });
    } else {
      res.status(401).json({ error: "Biometric verification failed" });
    }
  });

  app.post("/api/biometrics/disable", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    data.biometrics = { enabled: false, credentials: [] };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true });
  });

  app.post("/api/passwords", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    const newPassword = { ...req.body, id: Date.now().toString() };
    data.passwords.push(newPassword);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    broadcast({ type: "passwords_updated" });
    res.json(newPassword);
  });

  app.put("/api/passwords/:id", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    const index = data.passwords.findIndex((p: any) => p.id === req.params.id);
    if (index !== -1) {
      const oldPassword = data.passwords[index];
      const newPassword = req.body;

      // If the password value has changed, add the old one to history
      if (newPassword.value !== oldPassword.value) {
        newPassword.history = [
          ...(oldPassword.history || []),
          { value: oldPassword.value, changedAt: new Date().toISOString() }
        ];
      }

      data.passwords[index] = { ...oldPassword, ...newPassword };
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
      broadcast({ type: "passwords_updated" });
      res.json(data.passwords[index]);
    } else {
      res.status(404).json({ error: "Password not found" });
    }
  });

  app.delete("/api/passwords/:id", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    data.passwords = data.passwords.filter((p: any) => p.id !== req.params.id);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    broadcast({ type: "passwords_updated" });
    res.json({ success: true });
  });

  // 2FA Routes
  app.get("/api/2fa/status", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    res.json({ enabled: data.twoFactor?.enabled || false });
  });

  app.get("/api/2fa/setup", async (req, res) => {
    const secret = speakeasy.generateSecret({ name: "SecurePass Manager" });
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);
    res.json({ secret: secret.base32, qrCodeUrl });
  });

  app.post("/api/2fa/verify", (req, res) => {
    const { secret, token } = req.body;
    const verified = speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token,
    });

    if (verified) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
      data.twoFactor = { enabled: true, secret };
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
      res.json({ success: true });
    } else {
      res.status(400).json({ error: "Invalid 2FA code" });
    }
  });

  app.post("/api/2fa/check", (req, res) => {
    const { token } = req.body;
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    
    if (!data.twoFactor?.enabled) {
      return res.json({ success: true });
    }

    const verified = speakeasy.totp.verify({
      secret: data.twoFactor.secret,
      encoding: "base32",
      token,
    });

    if (verified) {
      res.json({ success: true });
    } else {
      res.status(400).json({ error: "Invalid 2FA code" });
    }
  });

  app.post("/api/2fa/reset", (req, res) => {
    const { recoveryKey } = req.body;
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    if (recoveryKey && cleanKey(recoveryKey) === cleanKey(data.auth.recoveryKey)) {
      data.twoFactor = { enabled: false, secret: "" };
      data.auth.recoveryKey = generateRecoveryKey(); // Rotate recovery key
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
      res.json({ success: true, newRecoveryKey: data.auth.recoveryKey });
    } else {
      res.status(401).json({ error: "Invalid recovery key" });
    }
  });

  app.post("/api/2fa/disable", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    data.twoFactor = { enabled: false, secret: "" };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
