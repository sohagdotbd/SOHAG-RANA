import React, { useState } from "react";
import { RefreshCw, Copy, Check, Info } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";

interface GeneratorProps {
  onGenerate: (password: string) => void;
}

const TOOLTIPS: Record<string, string> = {
  uppercase: "A-Z characters",
  lowercase: "a-z characters",
  numbers: "0-9 digits",
  symbols: "!@#$%^&* special characters",
};

export function Generator({ onGenerate }: GeneratorProps) {
  const [length, setLength] = useState(16);
  const [options, setOptions] = useState({
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  });
  const [generated, setGenerated] = useState("");
  const [copied, setCopied] = useState(false);
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);

  const generate = () => {
    const charset = {
      uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      lowercase: "abcdefghijklmnopqrstuvwxyz",
      numbers: "0123456789",
      symbols: "!@#$%^&*()_+~`|}{[]:;?><,./-=",
    };

    let characters = "";
    if (options.uppercase) characters += charset.uppercase;
    if (options.lowercase) characters += charset.lowercase;
    if (options.numbers) characters += charset.numbers;
    if (options.symbols) characters += charset.symbols;

    if (!characters) return;

    let result = "";
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    setGenerated(result);
    onGenerate(result);
  };

  const copy = () => {
    if (!generated) return;
    navigator.clipboard.writeText(generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-mono uppercase tracking-widest text-gray-400">
          Password Generator
        </h3>
        <button
          onClick={generate}
          className="p-1.5 rounded-full hover:bg-gray-200 transition-colors text-gray-600"
          title="Generate new password"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="relative group">
        <div className={cn(
          "flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 font-mono text-sm break-all min-h-[40px] flex items-center transition-all duration-300",
          copied ? "border-green-500 bg-green-50 ring-2 ring-green-100" : "group-hover:border-gray-300"
        )}>
          {generated || <span className="text-gray-300">Click refresh to generate</span>}
        </div>
        
        <AnimatePresence>
          {copied && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute -top-8 right-0 bg-green-600 text-white text-[10px] px-2 py-1 rounded font-bold uppercase tracking-widest shadow-lg"
            >
              Copied!
            </motion.div>
          )}
        </AnimatePresence>

        {generated && (
          <button
            onClick={copy}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white border border-gray-100 rounded-md hover:bg-gray-50 transition-colors text-gray-400 hover:text-gray-900 shadow-sm"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 font-mono">Length: {length}</span>
          <input
            type="range"
            min="8"
            max="32"
            value={length}
            onChange={(e) => setLength(parseInt(e.target.value))}
            className="w-32 accent-gray-900 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {Object.entries(options).map(([key, value]) => (
            <div key={key} className="relative">
              <label
                className="flex items-center gap-2 cursor-pointer group"
                onMouseEnter={() => setHoveredOption(key)}
                onMouseLeave={() => setHoveredOption(null)}
              >
                <input
                  type="checkbox"
                  checked={value}
                  onChange={() =>
                    setOptions((prev) => ({ ...prev, [key]: !value }))
                  }
                  className="w-3.5 h-3.5 rounded border-gray-300 text-gray-900 focus:ring-gray-900 transition-all cursor-pointer"
                />
                <span className="text-[10px] uppercase tracking-wider text-gray-500 group-hover:text-gray-900 transition-colors flex items-center gap-1">
                  {key}
                  <Info className="w-2.5 h-2.5 opacity-0 group-hover:opacity-40 transition-opacity" />
                </span>
              </label>
              
              <AnimatePresence>
                {hoveredOption === key && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute z-10 bottom-full left-0 mb-2 px-2 py-1 bg-gray-900 text-white text-[9px] rounded whitespace-nowrap pointer-events-none shadow-xl"
                  >
                    {TOOLTIPS[key]}
                    <div className="absolute top-full left-2 border-4 border-transparent border-t-gray-900" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
