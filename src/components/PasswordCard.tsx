import React, { useState, useEffect } from "react";
import { Eye, EyeOff, Copy, Check, Trash2, Edit2, ExternalLink, History, Calendar, AlertTriangle, Shield, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";
import * as OTPAuth from "otpauth";

interface PasswordCardProps {
  password: {
    id: string;
    title: string;
    username: string;
    value: string;
    url?: string;
    category?: string;
    expiresAt?: string;
    totpSecret?: string;
    history?: { value: string; changedAt: string }[];
  };
  onDelete: (id: string) => void | Promise<void>;
  onEdit: (password: any) => void;
}

export const PasswordCard: React.FC<PasswordCardProps> = ({ password, onDelete, onEdit }) => {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [copiedHistoryIndex, setCopiedHistoryIndex] = useState<number | null>(null);
  const [totpCode, setTotpCode] = useState<string>("");
  const [totpProgress, setTotpProgress] = useState<number>(0);
  const [copiedTotp, setCopiedTotp] = useState(false);

  useEffect(() => {
    if (password.totpSecret) {
      const totp = new OTPAuth.TOTP({
        issuer: "SecurePass",
        label: password.username,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: password.totpSecret,
      });

      const updateTotp = () => {
        setTotpCode(totp.generate());
        const seconds = Math.floor(Date.now() / 1000) % 30;
        setTotpProgress(((30 - seconds) / 30) * 100);
      };

      updateTotp();
      const interval = setInterval(updateTotp, 1000);
      return () => clearInterval(interval);
    }
  }, [password.totpSecret, password.username]);

  const isExpired = password.expiresAt && new Date(password.expiresAt) < new Date();
  const isExpiringSoon = password.expiresAt && !isExpired && new Date(password.expiresAt).getTime() - new Date().getTime() < 7 * 24 * 60 * 60 * 1000;

  const [showHistoryPasswords, setShowHistoryPasswords] = useState<Record<number, boolean>>({});

  const toggleHistoryPassword = (index: number) => {
    setShowHistoryPasswords(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const copy = (text: string, index?: number) => {
    navigator.clipboard.writeText(text);
    if (index !== undefined) {
      setCopiedHistoryIndex(index);
      setTimeout(() => setCopiedHistoryIndex(null), 2000);
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-xl hover:shadow-gray-100 transition-all duration-300 relative overflow-hidden"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900">{password.title}</h3>
            {password.category && (
              <span className="text-[10px] px-1.5 py-0.5 bg-gray-50 text-gray-400 rounded-full uppercase tracking-wider border border-gray-100">
                {password.category}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 font-mono">{password.username}</p>
        </div>
        <div className="flex gap-1 opacity-40 group-hover:opacity-100 transition-opacity duration-300">
          {(isExpired || isExpiringSoon) && (
            <div className={cn(
              "p-1.5 rounded-lg flex items-center gap-1.5 px-2",
              isExpired ? "bg-red-50 text-red-600" : "bg-orange-50 text-orange-600"
            )}>
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {isExpired ? "Expired" : "Expiring Soon"}
              </span>
            </div>
          )}
          {password.history && password.history.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                showHistory ? "bg-gray-900 text-white" : "hover:bg-gray-50 text-gray-400 hover:text-gray-900"
              )}
              title="View History"
            >
              <History className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => onEdit(password)}
            className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-blue-500 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(password.id)}
            className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {password.totpSecret && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between group/totp relative overflow-hidden">
          <div 
            className="absolute bottom-0 left-0 h-0.5 bg-blue-500 transition-all duration-1000 ease-linear"
            style={{ width: `${totpProgress}%` }}
          />
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-blue-500" />
            <div className="space-y-0.5">
              <p className="text-[8px] uppercase tracking-[0.2em] font-bold text-blue-400">Authenticator Code</p>
              <p className="text-lg font-mono font-bold text-blue-700 tracking-widest">
                {totpCode.slice(0, 3)} {totpCode.slice(3)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-100/50 px-1.5 py-0.5 rounded">
              {Math.floor((totpProgress / 100) * 30)}s
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(totpCode);
                setCopiedTotp(true);
                setTimeout(() => setCopiedTotp(false), 2000);
              }}
              className="p-2 rounded-lg hover:bg-white transition-colors text-blue-400 hover:text-blue-600 relative"
            >
            <AnimatePresence>
              {copiedTotp && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.5 }}
                  animate={{ opacity: 1, y: -25, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="absolute left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest shadow-lg z-10"
                >
                  Copied
                </motion.div>
              )}
            </AnimatePresence>
            {copiedTotp ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>
    )}

      <div className={cn(
        "flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border transition-all duration-300 relative",
        copied ? "border-green-500 bg-green-50 ring-2 ring-green-100" : "border-gray-100"
      )}>
        <div className="flex-1 font-mono text-sm tracking-widest text-gray-600 truncate">
          {show ? password.value : "••••••••••••••••"}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setShow(!show)}
            className="p-1.5 rounded-lg hover:bg-white transition-colors text-gray-400 hover:text-gray-900"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button
            onClick={() => copy(password.value)}
            className="p-1.5 rounded-lg hover:bg-white transition-colors text-gray-400 hover:text-gray-900 relative"
          >
            <AnimatePresence>
              {copied && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.5 }}
                  animate={{ opacity: 1, y: -25, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="absolute left-1/2 -translate-x-1/2 bg-green-600 text-white text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest shadow-lg z-10"
                >
                  Copied
                </motion.div>
              )}
            </AnimatePresence>
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showHistory && password.history && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-4 space-y-2 overflow-hidden"
          >
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-mono">Previous Passwords</p>
            <div className="space-y-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
              {password.history.slice().reverse().map((h, i) => (
                <div key={i} className={cn(
                  "flex items-center justify-between p-2 rounded-lg border group/item transition-all duration-300 relative",
                  copiedHistoryIndex === i ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-100"
                )}>
                  <div className="space-y-0.5 flex-1">
                    <p className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                      <span className="opacity-50 italic">Changed:</span>
                      {new Date(h.changedAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    <p className="text-xs font-mono text-gray-600 tracking-wider flex items-center gap-2">
                      {showHistoryPasswords[i] ? h.value : "••••••••"}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => toggleHistoryPassword(i)}
                      className="p-1.5 rounded-lg hover:bg-white transition-colors text-gray-400 hover:text-gray-900"
                    >
                      {showHistoryPasswords[i] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => copy(h.value, i)}
                      className="p-1.5 rounded-lg hover:bg-white transition-colors text-gray-400 hover:text-gray-900 relative"
                    >
                      <AnimatePresence>
                        {copiedHistoryIndex === i && (
                          <motion.div
                            initial={{ opacity: 0, y: 5, scale: 0.5 }}
                            animate={{ opacity: 1, y: -20, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            className="absolute left-1/2 -translate-x-1/2 bg-green-600 text-white text-[7px] px-1 py-0.5 rounded font-bold uppercase tracking-widest shadow-lg z-10"
                          >
                            Copied
                          </motion.div>
                        )}
                      </AnimatePresence>
                      {copiedHistoryIndex === i ? (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {(password.url || password.expiresAt) && (
        <div className="mt-4 flex items-center justify-between border-t border-gray-50 pt-3">
          <div className="flex items-center gap-4">
            {password.url && (
              <a
                href={password.url.startsWith("http") ? password.url : `https://${password.url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-gray-400 hover:text-gray-900 transition-colors flex items-center gap-1 uppercase tracking-wider"
              >
                <ExternalLink className="w-3 h-3" />
                {password.url.replace(/(https?:\/\/)?(www\.)?/, "").split("/")[0]}
              </a>
            )}
            {password.expiresAt && (
              <div className={cn(
                "text-[10px] flex items-center gap-1 uppercase tracking-wider",
                isExpired ? "text-red-500" : isExpiringSoon ? "text-orange-500" : "text-gray-400"
              )}>
                <Calendar className="w-3 h-3" />
                Expires: {new Date(password.expiresAt).toLocaleDateString()}
              </div>
            )}
          </div>
          {password.url && (
            <button
              onClick={() => {
                copy(password.value);
                const url = password.url?.startsWith("http") ? password.url : `https://${password.url}`;
                window.open(url, "_blank", "noopener,noreferrer");
              }}
              className="text-[10px] px-2 py-1 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-all uppercase tracking-widest font-bold flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <ExternalLink className="w-3 h-3" />
              Launch & Copy
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
