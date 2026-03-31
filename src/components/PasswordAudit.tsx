import React, { useMemo } from "react";
import { ShieldAlert, ShieldCheck, AlertTriangle, X, Info, Calendar, Trash2, Edit2 } from "lucide-react";
import { motion } from "motion/react";

interface PasswordAuditProps {
  passwords: any[];
  onClose: () => void;
  onDelete: (id: string) => void;
  onEdit: (password: any) => void;
}

export const PasswordAudit: React.FC<PasswordAuditProps> = ({ passwords, onClose, onDelete, onEdit }) => {
  const auditResults = useMemo(() => {
    const results = {
      weak: [] as any[],
      reused: {} as Record<string, any[]>,
      expired: [] as any[],
      expiringSoon: [] as any[],
      secure: [] as any[],
      categories: {} as Record<string, number>,
      score: 0,
    };

    const passwordCounts: Record<string, number> = {};
    passwords.forEach((p) => {
      passwordCounts[p.value] = (passwordCounts[p.value] || 0) + 1;
      if (p.category) {
        results.categories[p.category] = (results.categories[p.category] || 0) + 1;
      } else {
        results.categories["Uncategorized"] = (results.categories["Uncategorized"] || 0) + 1;
      }
    });

    passwords.forEach((p) => {
      const isWeak = p.value.length < 12 || 
                     !/[A-Z]/.test(p.value) || 
                     !/[a-z]/.test(p.value) || 
                     !/[0-9]/.test(p.value) || 
                     !/[^A-Za-z0-9]/.test(p.value);
      
      const isReused = passwordCounts[p.value] > 1;
      const isExpired = p.expiresAt && new Date(p.expiresAt) < new Date();
      const isExpiringSoon = p.expiresAt && !isExpired && new Date(p.expiresAt).getTime() - new Date().getTime() < 7 * 24 * 60 * 60 * 1000;

      if (isWeak || isReused || isExpired || isExpiringSoon) {
        if (isReused) {
          if (!results.reused[p.value]) results.reused[p.value] = [];
          results.reused[p.value].push(p);
        }
        if (isWeak) results.weak.push(p);
        if (isExpired) results.expired.push(p);
        if (isExpiringSoon) results.expiringSoon.push(p);
      } else {
        results.secure.push(p);
      }
    });

    const total = passwords.length;
    if (total > 0) {
      const weakPenalty = (results.weak.length / total) * 30;
      const reusePenalty = (Object.keys(results.reused).length / total) * 30;
      const expiredPenalty = (results.expired.length / total) * 40;
      results.score = Math.max(0, Math.round(100 - weakPenalty - reusePenalty - expiredPenalty));
    }

    return results;
  }, [passwords]);

  const reusedGroups = Object.values(auditResults.reused) as any[][];

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
        className="bg-white rounded-[32px] w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl flex flex-col"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-900 rounded-xl text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Security Audit</h2>
              <p className="text-xs text-gray-400 font-mono uppercase tracking-widest">Vault Analysis Report</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {/* Score Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-900 rounded-2xl p-6 text-white flex flex-col items-center justify-center text-center">
              <p className="text-[10px] uppercase tracking-[0.2em] opacity-50 mb-2">Security Score</p>
              <div className="text-4xl font-bold mb-1">{auditResults.score}%</div>
              <div className="w-full bg-white/10 h-1 rounded-full mt-2 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${auditResults.score}%` }}
                  className="h-full bg-white"
                />
              </div>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
              <ShieldAlert className="w-6 h-6 text-red-500 mb-2" />
              <p className="text-[10px] uppercase tracking-[0.2em] text-red-400 mb-1">Weak Passwords</p>
              <div className="text-2xl font-bold text-red-600">{auditResults.weak.length}</div>
            </div>
            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
              <AlertTriangle className="w-6 h-6 text-orange-500 mb-2" />
              <p className="text-[10px] uppercase tracking-[0.2em] text-orange-400 mb-1">Reused Passwords</p>
              <div className="text-2xl font-bold text-orange-600">{reusedGroups.length}</div>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
              <Calendar className="w-6 h-6 text-amber-500 mb-2" />
              <p className="text-[10px] uppercase tracking-[0.2em] text-amber-400 mb-1">Expiring Soon</p>
              <div className="text-2xl font-bold text-amber-600">{auditResults.expired.length + auditResults.expiringSoon.length}</div>
            </div>
          </div>
          
          {/* Category Summary */}
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-3 font-bold">Vault Composition</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(auditResults.categories).map(([category, count]) => (
                <div key={category} className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl flex items-center gap-2 shadow-sm">
                  <span className="text-xs font-medium text-gray-700">{category}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-md font-bold">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Findings */}
          <div className="space-y-6">
            {(auditResults.expired.length > 0 || auditResults.expiringSoon.length > 0) && (
              <section className="space-y-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Expiration Alerts
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {auditResults.expired.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-red-50/30 border border-red-100 rounded-xl group">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{p.title}</p>
                        <p className="text-[10px] text-gray-400 font-mono">Expired on {new Date(p.expiresAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-[10px] px-2 py-1 bg-red-100 text-red-600 rounded-md font-bold uppercase tracking-wider">
                          Expired
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => onEdit(p)} className="p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-blue-500 transition-colors">
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button onClick={() => onDelete(p.id)} className="p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {auditResults.expiringSoon.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-amber-50/30 border border-amber-100 rounded-xl group">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{p.title}</p>
                        <p className="text-[10px] text-gray-400 font-mono">Expires on {new Date(p.expiresAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-[10px] px-2 py-1 bg-amber-100 text-amber-600 rounded-md font-bold uppercase tracking-wider">
                          Expiring Soon
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => onEdit(p)} className="p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-blue-500 transition-colors">
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button onClick={() => onDelete(p.id)} className="p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {auditResults.weak.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  Weak Passwords Found
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {auditResults.weak.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-red-50/30 border border-red-100 rounded-xl group">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{p.title}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{p.username}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-[10px] px-2 py-1 bg-red-100 text-red-600 rounded-md font-bold uppercase tracking-wider">
                          Low Complexity
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => onEdit(p)} className="p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-blue-500 transition-colors">
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button onClick={() => onDelete(p.id)} className="p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {reusedGroups.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  Password Reuse Detected
                </h3>
                <div className="space-y-3">
                  {reusedGroups.map((group, i) => (
                    <div key={i} className="p-4 bg-orange-50/30 border border-orange-100 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-mono text-orange-600 font-bold uppercase tracking-widest">Shared Password</p>
                        <span className="text-[10px] px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full font-bold">
                          {group.length} Accounts
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {group.map((p) => (
                          <div key={p.id} className="px-3 py-1.5 bg-white border border-orange-100 rounded-lg text-xs font-medium text-gray-600 flex items-center gap-2 group/item">
                            {p.title}
                            <div className="flex gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                              <button onClick={() => onEdit(p)} className="p-1 hover:bg-gray-50 rounded text-gray-400 hover:text-blue-500 transition-colors">
                                <Edit2 className="w-2.5 h-2.5" />
                              </button>
                              <button onClick={() => onDelete(p.id)} className="p-1 hover:bg-gray-50 rounded text-gray-400 hover:text-red-500 transition-colors">
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {auditResults.secure.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Secure Passwords
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {auditResults.secure.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-green-50/30 border border-green-100 rounded-xl group">
                      <div className="flex items-center gap-3">
                        <ShieldCheck className="w-4 h-4 text-green-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{p.title}</p>
                          <p className="text-[10px] text-gray-400 font-mono">{p.username}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-[10px] px-2 py-1 bg-green-100 text-green-600 rounded-md font-bold uppercase tracking-wider">
                          Secure
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => onEdit(p)} className="p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-blue-500 transition-colors">
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button onClick={() => onDelete(p.id)} className="p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {auditResults.weak.length === 0 && reusedGroups.length === 0 && auditResults.expired.length === 0 && auditResults.expiringSoon.length === 0 && (
              <div className="flex flex-col items-center justify-center py-6 text-center bg-green-50/50 rounded-3xl border border-green-100">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-3">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-md font-bold text-gray-900">Perfect Security Score!</h3>
                <p className="text-gray-400 text-[11px] max-w-xs mt-1">
                  All your passwords meet the highest security standards.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
            <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-blue-900">Security Recommendation</p>
              <p className="text-[11px] text-blue-700 leading-relaxed">
                We recommend using passwords that are at least 12 characters long and include a mix of uppercase, lowercase, numbers, and symbols. Never reuse the same password across multiple services.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
