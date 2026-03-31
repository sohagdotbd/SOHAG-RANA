import React from "react";
import { X, Download, Chrome, Settings, Shield, Plus, Zap } from "lucide-react";
import { motion } from "motion/react";

interface ExtensionGuideProps {
  onClose: () => void;
  appUrl: string;
}

export const ExtensionGuide: React.FC<ExtensionGuideProps> = ({ onClose, appUrl }) => {
  return (
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
        className="bg-white rounded-[32px] w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl text-white">
              <Chrome className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Browser Extension</h2>
              <p className="text-xs text-gray-400 font-mono uppercase tracking-widest">Setup Guide</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Why use the extension?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <Shield className="w-5 h-5 text-blue-600 mb-2" />
                <p className="text-sm font-bold text-blue-900">Auto-fill Credentials</p>
                <p className="text-xs text-blue-700 mt-1">Seamlessly fill usernames and passwords on any website with one click.</p>
              </div>
              <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                <Plus className="w-5 h-5 text-green-600 mb-2" />
                <p className="text-sm font-bold text-green-900">Quick Add</p>
                <p className="text-xs text-green-700 mt-1">Save new credentials directly from your browser without opening the app.</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-gray-400" />
              Installation Steps
            </h3>
            
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center shrink-0 font-bold">1</div>
                <div>
                  <p className="font-bold text-gray-900">Download Extension Files</p>
                  <p className="text-sm text-gray-500 mt-1">The extension files are located in the <code className="bg-gray-100 px-1 rounded">/extension</code> directory of this project. You can download them as a ZIP from the settings menu.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center shrink-0 font-bold">2</div>
                <div>
                  <p className="font-bold text-gray-900">Open Extension Management</p>
                  <p className="text-sm text-gray-500 mt-1">In Chrome, go to <code className="bg-gray-100 px-1 rounded">chrome://extensions</code> and enable <b>Developer mode</b> in the top right corner.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center shrink-0 font-bold">3</div>
                <div>
                  <p className="font-bold text-gray-900">Load Unpacked</p>
                  <p className="text-sm text-gray-500 mt-1">Click <b>Load unpacked</b> and select the <code className="bg-gray-100 px-1 rounded">/extension</code> folder you downloaded.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center shrink-0 font-bold">4</div>
                <div>
                  <p className="font-bold text-gray-900">Configure App URL</p>
                  <p className="text-sm text-gray-500 mt-1">Open the extension popup and click <b>Configure App URL</b>. Paste the following URL:</p>
                  <div className="mt-2 p-3 bg-gray-900 text-white rounded-xl font-mono text-xs break-all select-all">
                    {appUrl}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors"
          >
            Got it
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
