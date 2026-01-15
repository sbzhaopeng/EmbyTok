
import React, { useState, useEffect } from 'react';
import { AuthData, DislikedItem } from '../types';
import { ChevronLeft, LogOut, Trash, User, Server, X, Heart } from 'lucide-react';

interface SettingsProps {
  auth: AuthData;
  onBack: () => void;
  onLogout: () => void;
}

const Settings: React.FC<SettingsProps> = ({ auth, onBack, onLogout }) => {
  const [dislikedItems, setDislikedItems] = useState<DislikedItem[]>([]);

  useEffect(() => {
    const list = JSON.parse(localStorage.getItem('disliked_items') || '[]');
    setDislikedItems(list);
  }, []);

  const clearDisliked = () => {
    if (window.confirm('确定要清空所有【不喜欢】列表吗？这些视频将重新出现在您的推荐中。')) {
      localStorage.removeItem('disliked_items');
      setDislikedItems([]);
    }
  };

  const removeSingleDislike = (id: string) => {
    const newList = dislikedItems.filter(item => item.id !== id);
    localStorage.setItem('disliked_items', JSON.stringify(newList));
    setDislikedItems(newList);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white pb-safe overflow-hidden">
      {/* 顶部标题栏 */}
      <div className="flex items-center justify-between p-6 pt-safe border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-10">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-white/10 rounded-full active:scale-90 transition-transform">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-black tracking-tight uppercase">系统设置</h1>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 hide-scrollbar">
        {/* 服务器连接信息 */}
        <div className="space-y-4">
          <h3 className="text-zinc-500 font-bold uppercase text-[10px] tracking-[0.2em] px-1">连接信息</h3>
          <div className="bg-zinc-900/40 rounded-3xl p-6 border border-white/5 space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center text-red-500">
                <Server size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">服务器地址</p>
                <p className="text-sm font-bold truncate text-zinc-200">{auth.ServerUrl}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400">
                <User size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">当前用户</p>
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-bold truncate text-zinc-200">{auth.Username}</p>
                  {auth.IsAdmin && (
                    <span className="bg-amber-500/20 text-amber-500 text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase">Admin</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 不喜欢列表管理 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-zinc-500 font-bold uppercase text-[10px] tracking-[0.2em]">不喜欢列表 ({dislikedItems.length})</h3>
            {dislikedItems.length > 0 && (
              <button 
                onClick={clearDisliked}
                className="text-red-500 text-xs font-black uppercase tracking-tighter hover:underline flex items-center gap-1"
              >
                <Trash size={12}/>
                批量清空
              </button>
            )}
          </div>
          
          <div className="bg-zinc-900/40 rounded-3xl border border-white/5 overflow-hidden">
            {dislikedItems.length > 0 ? (
              <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto hide-scrollbar">
                {dislikedItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-zinc-900/20 group hover:bg-zinc-800/40 transition-colors">
                    <div className="truncate pr-4 flex-1">
                      <p className="text-sm font-bold truncate text-zinc-200">{item.name}</p>
                      <p className="text-[10px] text-zinc-600 mt-0.5">
                        屏蔽于 {new Date(item.addedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button 
                      onClick={() => removeSingleDislike(item.id)}
                      className="p-2 bg-zinc-800 hover:bg-red-500/20 rounded-xl text-zinc-500 hover:text-red-500 transition-all active:scale-90"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-14 text-center">
                <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8 text-zinc-700" />
                </div>
                <p className="text-xs text-zinc-600 font-bold">暂无被屏蔽的内容</p>
              </div>
            )}
          </div>
        </div>

        {/* 退出登录 */}
        <div className="pt-4">
          <button 
            onClick={onLogout}
            className="w-full py-5 bg-red-500/10 hover:bg-red-500/20 rounded-3xl flex items-center justify-center space-x-3 text-red-500 font-black uppercase tracking-widest border border-red-500/20 active:scale-[0.98] transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span>退出当前账号</span>
          </button>
        </div>
      </div>

      <div className="p-8 text-center bg-black/20 border-t border-white/5">
        <p className="text-zinc-800 text-[10px] font-black tracking-[0.4em] uppercase">EmbyTok Pro • v0.0.1</p>
      </div>
    </div>
  );
};

export default Settings;
