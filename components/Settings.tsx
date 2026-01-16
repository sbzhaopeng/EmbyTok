
import React, { useState, useEffect, useMemo } from 'react';
import { AuthData, DislikedItem } from '../types';
import { EmbyService } from '../services/embyService';
import { ChevronLeft, LogOut, Trash2, User, Server, X, Shield, CheckSquare, Square, Loader2, AlertTriangle, ShieldOff } from 'lucide-react';

interface SettingsProps {
  auth: AuthData;
  onBack: () => void;
  onLogout: () => void;
}

const Settings: React.FC<SettingsProps> = ({ auth, onBack, onLogout }) => {
  const [dislikedItems, setDislikedItems] = useState<DislikedItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  
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
    if (selectedIds.size === dislikedItems.length && dislikedItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(dislikedItems.map(i => i.id)));
    }
  };

  // 移出屏蔽列表（不删除文件）
  const handleBatchUnblock = () => {
    if (selectedIds.size === 0) return;
    
    const newList = dislikedItems.filter(item => !selectedIds.has(item.id));
    localStorage.setItem('disliked_items', JSON.stringify(newList));
    setDislikedItems(newList);
    setSelectedIds(new Set());
    alert(`成功将 ${selectedIds.size} 个项目移出屏蔽列表。`);
  };

  // 物理删除文件
  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    const confirmMsg = `危险操作！\n确定要从服务器彻底删除这 ${selectedIds.size} 个视频文件吗？\n此操作不可恢复。`;
    if (!window.confirm(confirmMsg)) return;

    setIsProcessing(true);
    let successCount = 0;
    const idsToProcess = Array.from(selectedIds);
    
    for (const id of idsToProcess) {
      const success = await emby.deleteItem(id);
      if (success) successCount++;
    }

    // 无论物理删除是否成功，通常用户想让这些项目从列表中消失
    const newList = dislikedItems.filter(item => !selectedIds.has(item.id));
    localStorage.setItem('disliked_items', JSON.stringify(newList));
    setDislikedItems(newList);
    setSelectedIds(new Set());
    setIsProcessing(false);

    if (successCount === idsToProcess.length) {
      alert(`物理删除成功：${successCount} 个文件已移除。`);
    } else {
      alert(`部分操作完成：${successCount}/${idsToProcess.length} 个文件删除成功。\n失败原因可能是权限不足或文件不存在。`);
    }
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
            <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500"><Server size={24} /></div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">服务器</p>
              <p className="text-sm font-bold truncate text-zinc-200">{auth.ServerUrl}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400"><User size={24} /></div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">账号</p>
              <p className="text-sm font-bold truncate text-zinc-200">
                {auth.Username} 
                {auth.IsAdmin && <span className="text-amber-500 text-[8px] bg-amber-500/10 px-1 rounded ml-1 font-black">ADMIN</span>}
              </p>
            </div>
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
          
          <div className="bg-zinc-900/40 rounded-3xl border border-white/5 overflow-hidden flex flex-col min-h-[120px]">
            {dislikedItems.length > 0 ? (
              <>
                <div className="divide-y divide-white/5 max-h-[350px] overflow-y-auto hide-scrollbar">
                  {dislikedItems.map((item) => (
                    <div key={item.id} className="flex items-center p-4 bg-zinc-900/20 active:bg-zinc-800 transition-colors">
                      <button onClick={() => toggleSelect(item.id)} className="mr-4 text-zinc-600 active:scale-90 transition-transform">
                        {selectedIds.has(item.id) ? <CheckSquare className="w-5 h-5 text-red-500" /> : <Square className="w-5 h-5" />}
                      </button>
                      <div className="truncate flex-1" onClick={() => toggleSelect(item.id)}>
                        <p className="text-sm font-bold truncate text-zinc-200">{item.name}</p>
                        <p className="text-[10px] text-zinc-600 font-medium">屏蔽于 {new Date(item.addedAt).toLocaleDateString()}</p>
                      </div>
                      <button onClick={() => removeSingleDislike(item.id)} className="p-2 ml-2 text-zinc-600 hover:text-white"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
                
                {/* 批量操作按钮区域 */}
                {selectedIds.size > 0 && (
                  <div className="p-4 border-t border-white/5 bg-zinc-950/50 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={handleBatchUnblock}
                        disabled={isProcessing}
                        className="flex-1 py-3.5 bg-zinc-800 rounded-2xl text-white font-black text-[10px] uppercase flex items-center justify-center space-x-2 active:scale-95 transition-all disabled:opacity-50 border border-white/5"
                      >
                        <ShieldOff className="w-4 h-4" />
                        <span>仅移出列表</span>
                      </button>
                      <button 
                        onClick={handleBatchDelete}
                        disabled={isProcessing}
                        className="flex-1 py-3.5 bg-red-600 rounded-2xl text-white font-black text-[10px] uppercase flex items-center justify-center space-x-2 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        <span>从服务器删除</span>
                      </button>
                    </div>
                    <p className="text-[8px] text-zinc-500 text-center font-bold tracking-wider uppercase opacity-60">
                      已选择 {selectedIds.size} 个项目
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-14 text-center">
                <Shield className="w-10 h-10 text-zinc-800 mb-3" />
                <p className="text-xs text-zinc-600 font-bold uppercase tracking-widest">屏蔽列表为空</p>
              </div>
            )}
          </div>
        </div>

        <button onClick={onLogout} className="w-full py-5 bg-red-500/10 rounded-3xl flex items-center justify-center space-x-3 text-red-500 font-black uppercase tracking-widest border border-red-500/20 active:scale-[0.98] transition-all">
          <LogOut className="w-5 h-5" />
          <span>退出登录</span>
        </button>
      </div>
      <div className="p-8 text-center bg-black/20 border-t border-white/5">
        <p className="text-zinc-800 text-[10px] font-black tracking-[0.4em] uppercase">EmbyTok Pro • v0.0.1</p>
      </div>
    </div>
  );
};

export default Settings;
