import React, { useState, useEffect, useMemo } from 'react';
import { AuthData, DislikedItem } from '../types';
import { EmbyService } from '../services/embyService';
import { ChevronLeft, LogOut, Trash, User, Server, X, Shield, CheckSquare, Square, Loader2, AlertTriangle } from 'lucide-react';

interface SettingsProps {
  auth: AuthData;
  onBack: () => void;
  onLogout: () => void;
}

const Settings: React.FC<SettingsProps> = ({ auth, onBack, onLogout }) => {
  const [dislikedItems, setDislikedItems] = useState<DislikedItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  
  const emby = useMemo(() => new EmbyService(auth), [auth]);

  useEffect(() => {
    const list = JSON.parse(localStorage.getItem('disliked_items') || '[]');
    setDislikedItems(list);
  }, []);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    if (selectedIds.size === dislikedItems.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(dislikedItems.map(i => i.id)));
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`警告：确定要从服务器物理删除这 ${selectedIds.size} 个视频文件吗？此操作不可逆！`)) return;

    setIsDeleting(true);
    let successCount = 0;
    
    for (const id of selectedIds) {
      const success = await emby.deleteItem(id);
      if (success) successCount++;
    }

    // 更新本地列表
    const newList = dislikedItems.filter(item => !selectedIds.has(item.id));
    localStorage.setItem('disliked_items', JSON.stringify(newList));
    setDislikedItems(newList);
    setSelectedIds(new Set());
    setIsDeleting(false);

    alert(`操作完成：成功删除 ${successCount} 个文件。`);
  };

  const removeSingleDislike = (id: string) => {
    const newList = dislikedItems.filter(item => item.id !== id);
    localStorage.setItem('disliked_items', JSON.stringify(newList));
    setDislikedItems(newList);
    const nextSelect = new Set(selectedIds);
    nextSelect.delete(id);
    setSelectedIds(nextSelect);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white pb-safe overflow-hidden">
      <div className="flex items-center justify-between p-6 pt-safe border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-10">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-white/10 rounded-full active:scale-90 transition-transform"><ChevronLeft className="w-6 h-6" /></button>
        <h1 className="text-lg font-black tracking-tight uppercase">系统设置</h1>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 hide-scrollbar">
        {/* 用户信息 */}
        <div className="bg-zinc-900/40 rounded-3xl p-6 border border-white/5 space-y-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center text-red-500"><Server size={24} /></div>
            <div className="flex-1 min-w-0"><p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">服务器</p><p className="text-sm font-bold truncate text-zinc-200">{auth.ServerUrl}</p></div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400"><User size={24} /></div>
            <div className="flex-1 min-w-0"><p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">账号</p><p className="text-sm font-bold truncate text-zinc-200">{auth.Username} {auth.IsAdmin && <span className="text-amber-500 text-[8px] bg-amber-500/10 px-1 rounded ml-1">ADMIN</span>}</p></div>
          </div>
        </div>

        {/* 屏蔽列表管理 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-zinc-500" />
              <h3 className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">屏蔽列表 ({dislikedItems.length})</h3>
            </div>
            {dislikedItems.length > 0 && (
              <button onClick={selectAll} className="text-xs font-black text-blue-500 uppercase tracking-tighter">
                {selectedIds.size === dislikedItems.length ? '取消全选' : '全选'}
              </button>
            )}
          </div>
          
          <div className="bg-zinc-900/40 rounded-3xl border border-white/5 overflow-hidden">
            {dislikedItems.length > 0 ? (
              <>
                <div className="divide-y divide-white/5 max-h-[350px] overflow-y-auto hide-scrollbar">
                  {dislikedItems.map((item) => (
                    <div key={item.id} className="flex items-center p-4 bg-zinc-900/20 group">
                      <button onClick={() => toggleSelect(item.id)} className="mr-4 text-zinc-600 active:scale-90 transition-transform">
                        {selectedIds.has(item.id) ? <CheckSquare className="w-5 h-5 text-red-500" /> : <Square className="w-5 h-5" />}
                      </button>
                      <div className="truncate flex-1" onClick={() => toggleSelect(item.id)}>
                        <p className="text-sm font-bold truncate text-zinc-200">{item.name}</p>
                        <p className="text-[10px] text-zinc-600">屏蔽于 {new Date(item.addedAt).toLocaleDateString()}</p>
                      </div>
                      <button onClick={() => removeSingleDislike(item.id)} className="p-2 ml-2 text-zinc-600 hover:text-white"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
                {selectedIds.size > 0 && (
                  <div className="p-4 border-t border-white/5 bg-red-500/5">
                    <button 
                      onClick={handleBatchDelete}
                      disabled={isDeleting}
                      className="w-full py-3 bg-red-600 rounded-2xl text-white font-black text-xs uppercase flex items-center justify-center space-x-2 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                      <span>物理删除所选文件 ({selectedIds.size})</span>
                    </button>
                    <p className="text-[9px] text-red-500/60 text-center mt-2 font-bold italic">注意：文件将从 Emby 服务器硬盘中彻底移除</p>
                  </div>
                )}
              </>
            ) : (
              <div className="p-14 text-center">
                <Shield className="w-10 h-10 text-zinc-800 mx-auto mb-3" />
                <p className="text-xs text-zinc-600 font-bold uppercase tracking-widest">列表为空</p>
              </div>
            )}
          </div>
        </div>

        <button onClick={onLogout} className="w-full py-5 bg-red-500/10 rounded-3xl flex items-center justify-center space-x-3 text-red-500 font-black uppercase tracking-widest border border-red-500/20 active:scale-[0.98] transition-all">
          <LogOut className="w-5 h-5" />
          <span>退出登录</span>
        </button>
      </div>
      <div className="p-8 text-center bg-black/20 border-t border-white/5"><p className="text-zinc-800 text-[10px] font-black tracking-[0.4em] uppercase">EmbyTok Pro • v0.0.1</p></div>
    </div>
  );
};

export default Settings;