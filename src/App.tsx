import React, { useState, useEffect, useMemo } from "react";
import { Shield, Plus, Search, LogOut, Lock, Unlock, Key, RefreshCw, Fingerprint, ShieldCheck, AlertTriangle, Chrome, Copy } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PasswordCard } from "./components/PasswordCard";
import { PasswordForm } from "./components/PasswordForm";
import { PasswordAudit } from "./components/PasswordAudit";
import { ExtensionGuide } from "./components/ExtensionGuide";
import { cn } from "@/src/lib/utils";

import { QRScanner } from "./components/QRScanner";
import * as OTPAuth from "otpauth";

export default function App() {
  const [passwords, setPasswords] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [editingPassword, setEditingPassword] = useState<any>(null);
  const [isLocked, setIsLocked] = useState(true);
  const [loginStep, setLoginStep] = useState<"password" | "2fa">("password");
  const [masterPassword, setMasterPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [isSettingUp2FA, setIsSettingUp2FA] = useState(false);
  const [setupData, setSetupData] = useState<{ secret: string; qrCodeUrl: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [wasAutoLocked, setWasAutoLocked] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [authStatus, setAuthStatus] = useState<{ hasRecoveryKey: boolean; isDefault: boolean } | null>(null);
  const [isSecuritySettingsOpen, setIsSecuritySettingsOpen] = useState(false);
  const [oldMasterPassword, setOldMasterPassword] = useState("");
  const [newMasterPassword, setNewMasterPassword] = useState("");
  const [currentRecoveryKey, setCurrentRecoveryKey] = useState("");
  const [isRecoveryKeyVisible, setIsRecoveryKeyVisible] = useState(false);
  const [isExtensionGuideOpen, setIsExtensionGuideOpen] = useState(false);
  const [isScanning2FA, setIsScanning2FA] = useState(false);
  const [isResetting2FA, setIsResetting2FA] = useState(false);

  const formatRecoveryKey = (val: string) => {
    const cleaned = val.replace(/[^A-Z0-9]/g, "").toUpperCase().slice(0, 16);
    const parts = cleaned.match(/.{1,4}/g) || [];
    return parts.join("-");
  };

  // Auto-lock timer
  const AUTO_LOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  useEffect(() => {
    checkAuthStatus();
    checkBiometricSupport();
    fetchAuthStatus();
  }, []);

  const fetchAuthStatus = async () => {
    try {
      const res = await fetch("/api/auth/status");
      const data = await res.json();
      setAuthStatus(data);
    } catch (err) {
      console.error("Failed to fetch auth status", err);
    }
  };

  const fetchRecoveryKey = async () => {
    try {
      const res = await fetch("/api/auth/recovery-key");
      const data = await res.json();
      setCurrentRecoveryKey(data.recoveryKey);
    } catch (err) {
      console.error("Failed to fetch recovery key", err);
    }
  };

  const handleChangeMasterPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/auth/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword: oldMasterPassword, newPassword: newMasterPassword }),
      });
      if (res.ok) {
        alert("Master password changed successfully!");
        setIsSecuritySettingsOpen(false);
        setOldMasterPassword("");
        setNewMasterPassword("");
        fetchAuthStatus();
      } else {
        const data = await res.json();
        alert(data.error || "Change failed");
      }
    } catch (err) {
      console.error("Failed to change master password", err);
    }
  };

  const checkBiometricSupport = async () => {
    if (window.PublicKeyCredential) {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      setIsBiometricSupported(available);
    }
  };

  const checkAuthStatus = async () => {
    try {
      const [twoFARes, bioRes] = await Promise.all([
        fetch("/api/2fa/status"),
        fetch("/api/biometrics/status")
      ]);
      const [twoFAData, bioData] = await Promise.all([
        twoFARes.json(),
        bioRes.json()
      ]);
      setIs2FAEnabled(twoFAData.enabled);
      setIsBiometricEnabled(bioData.enabled);
    } catch (err) {
      console.error("Failed to check auth status", err);
    }
  };

  const registerBiometrics = async () => {
    if (!isBiometricSupported) return;
    
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      
      const userID = new Uint8Array(16);
      window.crypto.getRandomValues(userID);

      const options: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: { name: "SecurePass Manager" },
        user: {
          id: userID,
          name: "sohag.working@gmail.com",
          displayName: "Sohag"
        },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }],
        authenticatorSelection: {
          userVerification: "preferred",
          authenticatorAttachment: "platform"
        },
        timeout: 60000
      };

      const credential = await navigator.credentials.create({ publicKey: options }) as any;
      
      if (credential) {
        const res = await fetch("/api/biometrics/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            credential: {
              id: credential.id,
              rawId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
              type: credential.type
            }
          })
        });
        
        if (res.ok) {
          setIsBiometricEnabled(true);
          alert("Biometric authentication enabled!");
        }
      }
    } catch (err) {
      console.error("Biometric registration failed", err);
      alert("Failed to enable biometric authentication");
    }
  };

  const authenticateBiometric = async () => {
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const options: PublicKeyCredentialRequestOptions = {
        challenge,
        timeout: 60000,
        userVerification: "required"
      };

      const assertion = await navigator.credentials.get({ publicKey: options }) as any;
      
      if (assertion) {
        const res = await fetch("/api/biometrics/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: assertion.id })
        });
        
        if (res.ok) {
          setIsLocked(false);
          setError("");
        } else {
          setError("Biometric verification failed");
        }
      }
    } catch (err) {
      console.error("Biometric authentication failed", err);
      setError("Biometric authentication failed");
    }
  };

  const disableBiometrics = async () => {
    if (!confirm("Disable biometric authentication?")) return;
    try {
      const res = await fetch("/api/biometrics/disable", { method: "POST" });
      if (res.ok) {
        setIsBiometricEnabled(false);
      }
    } catch (err) {
      console.error("Failed to disable biometrics", err);
    }
  };

  useEffect(() => {
    // WebSocket for real-time updates
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}`;
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "passwords_updated" && !isLocked) {
        fetchPasswords();
      }
    };

    return () => {
      socket.close();
    };
  }, [isLocked]);

  useEffect(() => {
    if (!isLocked) {
      fetchPasswords();
      setWasAutoLocked(false);
      
      // Setup auto-lock
      let timeoutId: NodeJS.Timeout;

      const resetTimer = () => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          lockVault();
        }, AUTO_LOCK_TIMEOUT);
      };

      const lockVault = () => {
        setIsLocked(true);
        setLoginStep("password");
        setMasterPassword("");
        setTwoFactorCode("");
        setError("");
        setWasAutoLocked(true);
      };

      // Events to track activity
      const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
      
      events.forEach(event => {
        document.addEventListener(event, resetTimer);
      });

      // Initial timer start
      resetTimer();

      return () => {
        if (timeoutId) clearTimeout(timeoutId);
        events.forEach(event => {
          document.removeEventListener(event, resetTimer);
        });
      };
    }
  }, [isLocked]);

  const check2FAStatus = async () => {
    try {
      const res = await fetch("/api/2fa/status");
      const data = await res.json();
      setIs2FAEnabled(data.enabled);
    } catch (err) {
      console.error("Failed to check 2FA status", err);
    }
  };

  const fetchPasswords = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/passwords");
      const data = await res.json();
      setPasswords(data);
    } catch (err) {
      console.error("Failed to fetch passwords", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: masterPassword }),
      });
      
      if (res.ok) {
        if (is2FAEnabled) {
          setLoginStep("2fa");
          setError("");
        } else {
          setIsLocked(false);
          setError("");
        }
      } else {
        setError("Invalid master password");
        setMasterPassword("");
      }
    } catch (err) {
      setError("Connection error. Please try again.");
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const endpoint = isResetting2FA ? "/api/2fa/reset" : "/api/auth/reset";
      const body = isResetting2FA ? { recoveryKey } : { recoveryKey, newPassword };
      
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      
      if (res.ok) {
        const data = await res.json();
        alert(`${isResetting2FA ? "2FA reset" : "Password reset"} successful! Your NEW recovery key is: ${data.newRecoveryKey}. Please save it securely.`);
        setShowRecovery(false);
        setIsResetting2FA(false);
        setRecoveryKey("");
        setNewPassword("");
        setError("");
        fetchAuthStatus();
        setIsLocked(false); // Unlock the vault immediately
      } else {
        const data = await res.json();
        setError(data.error || "Reset failed");
      }
    } catch (err) {
      setError("Connection error. Please try again.");
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/2fa/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: twoFactorCode }),
      });
      
      if (res.ok) {
        setIsLocked(false);
        setError("");
      } else {
        setError("Invalid 2FA code");
        setTwoFactorCode("");
      }
    } catch (err) {
      setError("Verification failed");
    }
  };

  const start2FASetup = async () => {
    try {
      const res = await fetch("/api/2fa/setup");
      const data = await res.json();
      setSetupData(data);
      setIsSettingUp2FA(true);
    } catch (err) {
      console.error("Failed to start 2FA setup", err);
    }
  };

  const verifyAndEnable2FA = async () => {
    if (!setupData) return;
    try {
      const res = await fetch("/api/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: setupData.secret, token: twoFactorCode }),
      });
      
      if (res.ok) {
        setIs2FAEnabled(true);
        setIsSettingUp2FA(false);
        setSetupData(null);
        setTwoFactorCode("");
        alert("2FA enabled successfully!");
      } else {
        alert("Invalid verification code");
      }
    } catch (err) {
      console.error("Failed to enable 2FA", err);
    }
  };

  const disable2FA = async () => {
    if (!confirm("Are you sure you want to disable 2FA? This will reduce your security.")) return;
    try {
      const res = await fetch("/api/2fa/disable", { method: "POST" });
      if (res.ok) {
        setIs2FAEnabled(false);
        alert("2FA disabled");
      }
    } catch (err) {
      console.error("Failed to disable 2FA", err);
    }
  };

  const handleSave = async (data: any) => {
    try {
      const method = data.id ? "PUT" : "POST";
      const url = data.id ? `/api/passwords/${data.id}` : "/api/passwords";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (res.ok) {
        fetchPasswords();
        setIsFormOpen(false);
        setEditingPassword(null);
      }
    } catch (err) {
      console.error("Failed to save password", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this entry?")) return;
    try {
      const res = await fetch(`/api/passwords/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchPasswords();
      }
    } catch (err) {
      console.error("Failed to delete password", err);
    }
  };

  const securityScore = useMemo(() => {
    if (passwords.length === 0) return 100;
    const passwordCounts: Record<string, number> = {};
    let weakCount = 0;
    
    passwords.forEach((p) => {
      passwordCounts[p.value] = (passwordCounts[p.value] || 0) + 1;
      const isWeak = p.value.length < 12 || 
                     !/[A-Z]/.test(p.value) || 
                     !/[a-z]/.test(p.value) || 
                     !/[0-9]/.test(p.value) || 
                     !/[^A-Za-z0-9]/.test(p.value);
      if (isWeak) weakCount++;
    });

    const reusedCount = Object.values(passwordCounts).filter(c => c > 1).length;
    const total = passwords.length;
    const weakPenalty = (weakCount / total) * 30;
    const reusePenalty = (reusedCount / total) * 30;
    const expiredCount = passwords.filter(p => p.expiresAt && new Date(p.expiresAt) < new Date()).length;
    const expiredPenalty = (expiredCount / total) * 40;
    return Math.max(0, Math.round(100 - weakPenalty - reusePenalty - expiredPenalty));
  }, [passwords]);

  const expiringCount = useMemo(() => {
    return passwords.filter(p => {
      if (!p.expiresAt) return false;
      const isExpired = new Date(p.expiresAt) < new Date();
      const isExpiringSoon = !isExpired && new Date(p.expiresAt).getTime() - new Date().getTime() < 7 * 24 * 60 * 60 * 1000;
      return isExpired || isExpiringSoon;
    }).length;
  }, [passwords]);

  const filteredPasswords = passwords.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.username.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLocked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl shadow-gray-200 border border-gray-100"
        >
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center text-white mb-4 shadow-xl shadow-gray-200">
              {showRecovery ? <RefreshCw className="w-8 h-8" /> : (loginStep === "password" ? <Lock className="w-8 h-8" /> : <Shield className="w-8 h-8" />)}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">SecurePass</h1>
            {wasAutoLocked && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 px-3 py-1.5 bg-orange-50 border border-orange-100 rounded-full flex items-center gap-2 text-orange-600 text-[10px] uppercase font-bold tracking-widest"
              >
                <Lock className="w-3 h-3" />
                Vault Auto-Locked due to inactivity
              </motion.div>
            )}
            <p className="text-gray-400 text-sm">
              {showRecovery 
                ? (isResetting2FA ? "Reset 2FA using your recovery key." : "Reset your master password using your recovery key.")
                : (loginStep === "password" 
                  ? "Enter your master password to unlock your vault." 
                  : "Enter the 6-digit code from your authenticator app.")}
            </p>
          </div>

          {showRecovery ? (
            <form onSubmit={handleRecoverySubmit} className="space-y-4">
              <div className="space-y-4 mb-6">
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-900 transition-colors">
                    <Key className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    required
                    value={recoveryKey}
                    onChange={(e) => setRecoveryKey(formatRecoveryKey(e.target.value))}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all outline-none text-lg font-mono"
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                  />
                </div>
                {!isResetting2FA && (
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-900 transition-colors">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all outline-none text-lg font-mono"
                      placeholder="New Master Password"
                    />
                  </div>
                )}
              </div>

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-red-500 text-xs text-center font-medium"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <button
                type="submit"
                className="w-full py-4 bg-orange-600 text-white rounded-2xl font-semibold hover:bg-orange-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-100 active:scale-[0.98]"
              >
                <RefreshCw className="w-5 h-5" />
                {isResetting2FA ? "Reset 2FA & Unlock" : "Reset & Unlock"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowRecovery(false);
                  setIsResetting2FA(false);
                  setError("");
                }}
                className="w-full py-2 text-sm text-gray-400 hover:text-gray-900 transition-colors"
              >
                Back to Login
              </button>
            </form>
          ) : (
            <form onSubmit={loginStep === "password" ? handlePasswordSubmit : handle2FASubmit} className="space-y-4">
              {loginStep === "password" ? (
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-900 transition-colors">
                    <Key className="w-5 h-5" />
                  </div>
                  <input
                    type="password"
                    required
                    autoFocus
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all outline-none text-lg font-mono"
                    placeholder="Master Password"
                  />
                </div>
              ) : (
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-900 transition-colors">
                    <Shield className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={6}
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ""))}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all outline-none text-2xl font-mono tracking-[0.5em] text-center"
                    placeholder="000000"
                  />
                </div>
              )}
              
              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-red-500 text-xs text-center font-medium"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <button
                type="submit"
                className="w-full py-4 bg-gray-900 text-white rounded-2xl font-semibold hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-gray-200 active:scale-[0.98]"
              >
                {loginStep === "password" ? <Unlock className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                {loginStep === "password" ? "Unlock Vault" : "Verify & Unlock"}
              </button>

              {loginStep === "password" && (
                <div className="flex justify-center mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRecovery(true);
                      setIsResetting2FA(false);
                    }}
                    className="text-xs text-gray-400 hover:text-gray-900 transition-colors font-medium underline underline-offset-4"
                  >
                    Forgot Master Password?
                  </button>
                </div>
              )}

              {loginStep === "2fa" && (
                <div className="flex justify-center mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRecovery(true);
                      setIsResetting2FA(true);
                    }}
                    className="text-xs text-gray-400 hover:text-gray-900 transition-colors font-medium underline underline-offset-4"
                  >
                    Lost Authenticator? Use Recovery Key
                  </button>
                </div>
              )}

              {isBiometricEnabled && loginStep === "password" && (
                <div className="flex flex-col items-center gap-3 mt-4">
                  <div className="w-full h-px bg-gray-50" />
                  <button
                    type="button"
                    onClick={authenticateBiometric}
                    className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors py-2"
                  >
                    <Fingerprint className="w-4 h-4" />
                    Unlock with Biometrics
                  </button>
                </div>
              )}

              {loginStep === "2fa" && (
                <button
                  type="button"
                  onClick={() => {
                    setLoginStep("password");
                    setError("");
                    setTwoFactorCode("");
                  }}
                  className="w-full text-xs text-gray-400 hover:text-gray-900 transition-colors py-2"
                >
                  Back to password
                </button>
              )}
            </form>
          )}
          
          <div className="mt-8 pt-6 border-t border-gray-50 text-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-mono">
              {loginStep === "password" ? "Hint: admin123" : "Check your Authenticator App"}
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  const handleScan2FA = (decodedText: string) => {
    try {
      const uri = OTPAuth.URI.parse(decodedText);
      if (uri.secret && setupData) {
        setSetupData({ ...setupData, secret: uri.secret.base32 });
        setIsScanning2FA(false);
      }
    } catch (error) {
      if (setupData) {
        setSetupData({ ...setupData, secret: decodedText.trim() });
        setIsScanning2FA(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-gray-900 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-900 rounded-xl text-white shadow-lg shadow-gray-200">
              <Shield className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">SecurePass</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className={cn(
              "hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] uppercase font-bold tracking-widest border",
              is2FAEnabled ? "bg-green-50 text-green-600 border-green-100" : "bg-orange-50 text-orange-600 border-orange-100"
            )}>
              <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", is2FAEnabled ? "bg-green-500" : "bg-orange-500")} />
              {is2FAEnabled ? "2FA Active" : "2FA Recommended"}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono uppercase tracking-widest hidden lg:flex">
              <RefreshCw className="w-3 h-3 animate-spin-slow" />
              Auto-lock active
            </div>
            <button
              onClick={() => {
                setIsLocked(true);
                setLoginStep("password");
                setMasterPassword("");
                setTwoFactorCode("");
                setWasAutoLocked(false);
              }}
              className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-all"
              title="Lock Vault"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {expiringCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-900">Security Alert</p>
                <p className="text-xs text-amber-700">You have {expiringCount} password{expiringCount > 1 ? 's' : ''} that are expired or expiring soon.</p>
              </div>
            </div>
            <button
              onClick={() => setIsAuditOpen(true)}
              className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl hover:bg-amber-700 transition-colors uppercase tracking-widest"
            >
              Review Now
            </button>
          </motion.div>
        )}

        {/* Actions Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-900 transition-colors">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              placeholder="Search vault (title, username, category)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-gray-900 transition-all outline-none text-sm shadow-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={is2FAEnabled ? disable2FA : start2FASetup}
              className={cn(
                "px-4 py-3.5 rounded-2xl font-medium transition-all flex items-center justify-center gap-2 border shadow-sm",
                is2FAEnabled ? "bg-white border-gray-200 text-gray-600 hover:bg-gray-50" : "bg-orange-500 text-white border-orange-400 hover:bg-orange-600"
              )}
            >
              <Shield className="w-5 h-5" />
              {is2FAEnabled ? "Disable 2FA" : "Setup 2FA"}
            </button>
            {isBiometricSupported && (
              <button
                onClick={isBiometricEnabled ? disableBiometrics : registerBiometrics}
                className={cn(
                  "px-4 py-3.5 rounded-2xl font-medium transition-all flex items-center justify-center gap-2 border shadow-sm",
                  isBiometricEnabled ? "bg-white border-gray-200 text-gray-600 hover:bg-gray-50" : "bg-blue-500 text-white border-blue-400 hover:bg-blue-600"
                )}
              >
                <Fingerprint className="w-5 h-5" />
                {isBiometricEnabled ? "Disable Biometric" : "Setup Biometric"}
              </button>
            )}
            <button
              onClick={() => setIsExtensionGuideOpen(true)}
              className="px-4 py-3.5 bg-white border border-gray-200 text-gray-600 rounded-2xl font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Chrome className="w-5 h-5" />
              Extension
            </button>
            <button
              onClick={() => {
                fetchRecoveryKey();
                setIsSecuritySettingsOpen(true);
              }}
              className="px-4 py-3.5 bg-white border border-gray-200 text-gray-600 rounded-2xl font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <ShieldCheck className="w-5 h-5" />
              Security
            </button>
            <button
              onClick={() => setIsAuditOpen(true)}
              className="px-4 py-3.5 bg-white border border-gray-200 text-gray-600 rounded-2xl font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <AlertTriangle className="w-5 h-5" />
              Audit
            </button>
            <button
              onClick={() => {
                setEditingPassword(null);
                setIsFormOpen(true);
              }}
              className="px-6 py-3.5 bg-gray-900 text-white rounded-2xl font-medium hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-gray-200 active:scale-[0.98]"
            >
              <Plus className="w-5 h-5" />
              Add Entry
            </button>
          </div>
        </div>

        {/* Security Settings Modal */}
        <AnimatePresence>
          {isSecuritySettingsOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-[32px] w-full max-w-md p-8 shadow-2xl space-y-8"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Security Settings</h2>
                    <p className="text-gray-400 text-sm mt-1">Manage your master password and recovery key.</p>
                  </div>
                  <button 
                    onClick={() => setIsSecuritySettingsOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <Plus className="w-5 h-5 rotate-45 text-gray-400" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Recovery Key Section */}
                  <div className="p-6 bg-orange-50 rounded-2xl border border-orange-100 space-y-4">
                    <div className="flex items-center gap-2 text-orange-600">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="text-sm font-bold uppercase tracking-wider">Recovery Key</span>
                    </div>
                    <p className="text-xs text-orange-800/70 leading-relaxed">
                      Use this key to reset your master password if you forget it. Store it in a safe, offline location.
                    </p>
                    <div className="relative group">
                      <div className="w-full p-4 bg-white border border-orange-200 rounded-xl font-mono text-sm tracking-widest text-center select-all">
                        {isRecoveryKeyVisible ? currentRecoveryKey : "••••-••••-••••-••••"}
                      </div>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(currentRecoveryKey);
                            alert("Recovery key copied to clipboard!");
                          }}
                          className="text-orange-400 hover:text-orange-600 transition-colors"
                          title="Copy Recovery Key"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setIsRecoveryKeyVisible(!isRecoveryKeyVisible)}
                          className="text-orange-400 hover:text-orange-600 transition-colors"
                        >
                          {isRecoveryKeyVisible ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Change Password Section */}
                  <form onSubmit={handleChangeMasterPassword} className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Change Master Password</h3>
                    <div className="space-y-3">
                      <input
                        type="password"
                        required
                        placeholder="Current Master Password"
                        value={oldMasterPassword}
                        onChange={(e) => setOldMasterPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-gray-900 outline-none text-sm"
                      />
                      <input
                        type="password"
                        required
                        placeholder="New Master Password"
                        value={newMasterPassword}
                        onChange={(e) => setNewMasterPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-gray-900 outline-none text-sm"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
                    >
                      Update Password
                    </button>
                  </form>

                  {/* 2FA Section */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-900 rounded-xl text-white">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">Two-Factor Auth</p>
                        <p className="text-[10px] text-gray-400 uppercase font-mono tracking-wider">
                          {is2FAEnabled ? "Status: Enabled" : "Status: Disabled"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {is2FAEnabled ? (
                        <>
                          <button
                            onClick={disable2FA}
                            className="px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                          >
                            Disable
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm("This will disable your current 2FA and start setup for a new one. Continue?")) {
                                const res = await fetch("/api/2fa/disable", { method: "POST" });
                                if (res.ok) {
                                  setIs2FAEnabled(false);
                                  start2FASetup();
                                }
                              }
                            }}
                            className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                          >
                            Reset
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={start2FASetup}
                          className="px-4 py-2 text-xs font-bold text-white bg-gray-900 rounded-xl hover:bg-gray-800 transition-all shadow-lg shadow-gray-100"
                        >
                          Enable
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 2FA Setup Modal */}
        <AnimatePresence>
          {isSettingUp2FA && setupData && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-[32px] w-full max-w-md p-8 shadow-2xl space-y-6"
              >
                <div className="text-center">
                  <h2 className="text-xl font-bold text-gray-900">Setup Two-Factor Auth</h2>
                  <p className="text-gray-400 text-sm mt-2">Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)</p>
                  <div className="mt-4 p-3 bg-orange-50 border border-orange-100 rounded-xl">
                    <p className="text-[10px] text-orange-600 font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
                      <AlertTriangle className="w-3 h-3" />
                      Important Reminder
                    </p>
                    <p className="text-[11px] text-orange-800/70 mt-1">
                      Ensure you have saved your <b>Recovery Key</b> from the Security settings. It is your only way to regain access if you lose your authenticator device.
                    </p>
                  </div>
                </div>

                <div className="flex justify-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <img src={setupData.qrCodeUrl} alt="2FA QR Code" className="w-48 h-48" />
                </div>

                <div className="space-y-4">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center relative group">
                    <p className="text-[10px] text-gray-400 uppercase font-mono mb-1">Manual Key</p>
                    <p className="text-sm font-mono font-bold tracking-widest">{setupData.secret}</p>
                    <button
                      onClick={() => setIsScanning2FA(true)}
                      className="absolute top-2 right-2 p-1.5 bg-white border border-gray-100 rounded-lg text-gray-400 hover:text-gray-900 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                      title="Scan QR Code"
                    >
                      <Chrome className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-mono text-gray-400">Verify Code</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ""))}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-gray-900 outline-none text-center text-xl font-mono tracking-[0.5em]"
                      placeholder="000000"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setIsSettingUp2FA(false);
                        setSetupData(null);
                        setTwoFactorCode("");
                      }}
                      className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={verifyAndEnable2FA}
                      className="flex-1 py-3 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-all"
                    >
                      Enable 2FA
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Categories / Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Entries", value: passwords.length },
            { label: "Categories", value: new Set(passwords.map(p => p.category)).size },
            { 
              label: "Security Score", 
              value: `${securityScore}%`, 
              action: () => setIsAuditOpen(true),
              highlight: securityScore < 70 ? "text-red-500" : securityScore < 90 ? "text-orange-500" : "text-green-500"
            },
            { label: "Last Sync", value: "Just now" },
          ].map((stat, i) => (
            <div 
              key={i} 
              onClick={stat.action}
              className={cn(
                "bg-white p-4 rounded-2xl border border-gray-100 shadow-sm",
                stat.action && "cursor-pointer hover:border-gray-900 transition-colors group"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-mono">{stat.label}</p>
                {stat.action && <ShieldCheck className="w-3 h-3 text-gray-300 group-hover:text-gray-900 transition-colors" />}
              </div>
              <p className={cn("text-xl font-bold", stat.highlight || "text-gray-900")}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RefreshCw className="w-8 h-8 text-gray-300 animate-spin" />
            <p className="text-gray-400 text-sm font-mono uppercase tracking-widest">Accessing Vault...</p>
          </div>
        ) : filteredPasswords.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredPasswords.map((p) => (
                <PasswordCard
                  key={p.id}
                  password={p}
                  onDelete={handleDelete}
                  onEdit={(pass) => {
                    setEditingPassword(pass);
                    setIsFormOpen(true);
                  }}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-300 mb-4">
              <Search className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No entries found</h3>
            <p className="text-gray-400 text-sm max-w-xs mt-2">
              {search ? "Try adjusting your search terms or filters." : "Start by adding your first secure entry to the vault."}
            </p>
          </motion.div>
        )}
      </main>

      <AnimatePresence>
        {isFormOpen && (
          <PasswordForm
            initialData={editingPassword}
            onSave={handleSave}
            onClose={() => {
              setIsFormOpen(false);
              setEditingPassword(null);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAuditOpen && (
          <PasswordAudit
            passwords={passwords}
            onClose={() => setIsAuditOpen(false)}
            onDelete={handleDelete}
            onEdit={(p) => {
              setEditingPassword(p);
              setIsFormOpen(true);
              setIsAuditOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isScanning2FA && (
          <QRScanner
            onScan={handleScan2FA}
            onClose={() => setIsScanning2FA(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isExtensionGuideOpen && (
          <ExtensionGuide 
            onClose={() => setIsExtensionGuideOpen(false)} 
            appUrl={window.location.origin}
          />
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-4 py-12 text-center">
        <p className="text-[10px] text-gray-400 uppercase tracking-[0.3em] font-mono">
          SecurePass Manager &copy; 2026 &bull; End-to-End Encrypted
        </p>
      </footer>
    </div>
  );
}
