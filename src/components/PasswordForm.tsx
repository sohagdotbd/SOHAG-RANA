import React, { useState, useEffect } from "react";
import { X, Save, Shield, Key, User, Globe, Tag, Calendar, RefreshCw, Camera } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { StrengthIndicator } from "./StrengthIndicator";
import { Generator } from "./Generator";
import { QRScanner } from "./QRScanner";
import { cn } from "@/src/lib/utils";
import * as OTPAuth from "otpauth";

interface PasswordFormProps {
  onSave: (password: any) => void;
  onClose: () => void;
  initialData?: any;
}

export function PasswordForm({ onSave, onClose, initialData }: PasswordFormProps) {
  const [formData, setFormData] = useState({
    title: "",
    username: "",
    value: "",
    url: "",
    category: "General",
    expiresAt: "",
    totpSecret: "",
  });

  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleScan = (decodedText: string) => {
    try {
      const uri = OTPAuth.URI.parse(decodedText);
      if (uri.secret) {
        setFormData({ ...formData, totpSecret: uri.secret.base32 });
        setIsScanning(false);
      }
    } catch (error) {
      // If it's not a valid OTPAuth URI, try to use the raw text as the secret
      setFormData({ ...formData, totpSecret: decodedText.trim() });
      setIsScanning(false);
    }
  };

  return (
    <>
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
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-900 rounded-xl text-white">
              <Shield className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-medium text-gray-900">
              {initialData ? "Edit Password" : "New Secure Entry"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-mono text-gray-400 flex items-center gap-2">
                <Tag className="w-3 h-3" /> Title
              </label>
              <input
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all outline-none text-sm"
                placeholder="e.g. Google Account"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-mono text-gray-400 flex items-center gap-2">
                <Shield className="w-3 h-3" /> Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all outline-none text-sm appearance-none"
              >
                {[
                  "General", 
                  "Social", 
                  "Work", 
                  "Finance", 
                  "Entertainment", 
                  "Shopping", 
                  "Health", 
                  "Education", 
                  "Travel", 
                  "Gaming", 
                  "Utilities",
                  "Other"
                ].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest font-mono text-gray-400 flex items-center gap-2">
              <User className="w-3 h-3" /> Username / Email
            </label>
            <input
              required
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all outline-none text-sm"
              placeholder="user@example.com"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase tracking-widest font-mono text-gray-400 flex items-center gap-2">
                <Key className="w-3 h-3" /> Password
              </label>
              <button
                type="button"
                onClick={() => {
                  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=";
                  let result = "";
                  for (let i = 0; i < 20; i++) {
                    result += charset.charAt(Math.floor(Math.random() * charset.length));
                  }
                  setFormData({ ...formData, value: result });
                }}
                className="text-[10px] uppercase tracking-widest font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Suggest Strong
              </button>
            </div>
            <input
              required
              type="text"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl font-mono focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all outline-none text-sm"
              placeholder="••••••••••••"
            />
            <StrengthIndicator password={formData.value} />
          </div>

          <Generator onGenerate={(pass) => setFormData({ ...formData, value: pass })} />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase tracking-widest font-mono text-gray-400 flex items-center gap-2">
                <Shield className="w-3 h-3" /> TOTP Secret (Optional)
              </label>
              <button
                type="button"
                onClick={() => setIsScanning(true)}
                className="text-[10px] uppercase tracking-widest font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
              >
                <Camera className="w-3 h-3" /> Scan QR
              </button>
            </div>
            <input
              value={formData.totpSecret}
              onChange={(e) => setFormData({ ...formData, totpSecret: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl font-mono focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all outline-none text-sm"
              placeholder="JBSWY3DPEHPK3PXP"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest font-mono text-gray-400 flex items-center gap-2">
              <Globe className="w-3 h-3" /> Website URL (Optional)
            </label>
            <input
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all outline-none text-sm"
              placeholder="https://google.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest font-mono text-gray-400 flex items-center gap-2">
              <Calendar className="w-3 h-3" /> Expiration Date (Optional)
            </label>
            <input
              type="date"
              value={formData.expiresAt}
              onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all outline-none text-sm appearance-none"
            />
          </div>
        </form>

        <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-white transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-6 py-3 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-gray-200"
          >
            <Save className="w-4 h-4" />
            {initialData ? "Update Entry" : "Save Entry"}
          </button>
        </div>
      </motion.div>
    </motion.div>

      <AnimatePresence>
        {isScanning && (
          <QRScanner
            onScan={handleScan}
            onClose={() => setIsScanning(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
