import React, { useRef, useState, useEffect, useMemo } from 'react';
import { EmbyItem, AuthData } from '../types';
import { EmbyService } from '../services/embyService';
import { Trash2, Heart, XCircle, Info, AlertTriangle, X, Loader2 } from 'lucide-react';

interface VideoItemProps {
  item: EmbyItem;
  auth: AuthData;
  libraryName: string; 
  isActive: boolean;
  isNext?: boolean; 
  isMuted: boolean;
  isAutoplay: boolean;
  fitMode: 'contain' | 'cover';
  onDelete: (id: string) => void;
  onDislike: (item: EmbyItem) => void;
  onEnded: () => void;
}

const VideoItem: React.FC<VideoItemProps> = ({ 
  item, auth, libraryName, isActive, isNext, isMuted, isAutoplay, fitMode, onDelete, onDislike, onEnded 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [isLiked, setIsLiked] = useState(item.UserData.IsFavorite);
  const [isLandscape, setIsLandscape] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0);
  const [isPlayed, setIsPlayed] = useState(item.UserData.PlayCount > 0);
  
  const deleteTimerRef = useRef<number | null>(null);
  const emby = useMemo(() => new EmbyService(auth), [auth]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      resetDeleteState();
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(e => {
            console.warn("Autoplay blocked:", e);
            setIsPlaying(false);
          });
      }
    } else {
      video.pause();
      setIsPlaying(false);
      setShowInfo(false);
      resetDeleteState();
    }
  }, [isActive]);

  const resetDeleteState = () => {
    setDeleteStep(0);
    if (deleteTimerRef.current) {
      window.clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }
  };

  const handleMetadata = () => {
    setIsLoading(false);
    if (videoRef.current) {
      const { videoWidth, videoHeight } = videoRef.current;
      setIsLandscape(videoWidth > videoHeight);
    }
  };

  const handleVideoEnded = () => {
    // 通知 Emby 已读
    emby.markAsPlayed(item.Id);
    setIsPlayed(true);
    // 回调通知父组件（可选逻辑）
    onEnded();
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleDeleteConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (deleteStep === 0) {
      // 第一步：变色并等待确认
      setDeleteStep(1);
      if (deleteTimerRef.current) window.clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = window.setTimeout(() => {
        setDeleteStep(0);
      }, 3000); // 3秒内不确认则重置
    } else {
      // 第二步：执行删除
      onDelete(item.Id);
      resetDeleteState();
    }
  };

  const formatDuration = (ticks?: number) => {
    if (!ticks) return '未知时长';
    const totalSeconds = Math.floor(ticks / 10000000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className="relative w-full h-[100dvh] snap-start bg-black flex items-center justify-center overflow-hidden"
    >
      {/* 背景模糊 */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-20 blur-3xl scale-110 pointer-events-none z-0"
        style={{ backgroundImage: `url(${emby.getImageUrl(item.Id, item.ImageTags.Primary)})` }}
      />

      {/* 视频主体 */}
      <div className="absolute inset-0 flex items-center justify-center z-10" onClick={togglePlay}>
        <video
          ref={videoRef}
          src={emby.getVideoUrl(item.Id)}
          loop={true} // 自动重播
          onEnded={handleVideoEnded}
          onLoadedMetadata={handleMetadata}
          onWaiting={() => setIsLoading(true)}
          onPlaying={() => setIsLoading(false)}
          muted={isMuted}
          playsInline
          preload={isActive || isNext ? "auto" : "metadata"}
          className={`max-w-full max-h-full pointer-events-none transition-transform duration-500 ${fitMode === 'contain' || isLandscape ? 'object-contain' : 'object-cover w-full h-full'}`}
        />
        
        {isLoading && isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
            <Loader2 className="w-10 h-10 text-white/50 animate-spin" />
          </div>
        )}
      </div>

      {/* 侧边工具栏 */}
      <div className="absolute right-4 bottom-16 flex flex-col items-center space-y-7 z-[90] pb-safe">
        {/* 喜欢按钮 */}
        <button onClick={(e) => { e.stopPropagation(); const next = !isLiked; setIsLiked(next); emby.setFavorite(item.Id, next); }} className="flex flex-col items-center active:scale-125 transition-transform">
          <Heart className={`w-8 h-8 drop-shadow-lg ${isLiked ? 'text-red-500 fill-current' : 'text-white'}`} />
          <span className="text-[10px] font-black mt-1.5 text-white shadow-sm">喜欢</span>
        </button>

        {/* 屏蔽按钮 */}
        <button onClick={(e) => { e.stopPropagation(); onDislike(item); }} className="flex flex-col items-center active:scale-90 transition-transform">
          <XCircle className="w-8 h-8 text-white drop-shadow-lg" />
          <span className="text-[10px] font-black mt-1.5 text-white shadow-sm">屏蔽</span>
        </button>

        {/* 两步确认删除按钮 */}
        <button 
          onClick={handleDeleteConfirm}
          className={`flex flex-col items-center transition-all duration-300 p-2 rounded-2xl ${deleteStep === 1 ? 'bg-red-600 scale-110 shadow-lg' : 'hover:bg-white/10'}`}
        >
          {deleteStep === 0 ? (
            <Trash2 className="w-8 h-8 text-white drop-shadow-lg" />
          ) : (
            <AlertTriangle className="w-8 h-8 text-white animate-pulse" />
          )}
          <span className={`text-[10px] font-black mt-1.5 uppercase ${deleteStep === 1 ? 'text-white' : 'text-white/70'}`}>
            {deleteStep === 0 ? '删除' : '确认'}
          </span>
        </button>

        {/* 详情按钮 */}
        <button onClick={(e) => { e.stopPropagation(); setShowInfo(true); }} className="flex flex-col items-center">
          <Info className={`w-8 h-8 ${showInfo ? 'text-blue-400' : 'text-white'} drop-shadow-lg`} />
          <span className="text-[10px] font-black mt-1.5 text-white shadow-sm">详情</span>
        </button>
      </div>

      {/* 底部信息 */}
      <div className="absolute left-6 bottom-10 right-24 z-40 pb-safe pointer-events-none">
        <h2 className="text-xl font-black text-white mb-2 truncate drop-shadow-lg">{item.Name}</h2>
        <div className="flex items-center space-x-2 text-[10px] font-black">
          <span className="bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-md border border-white/5 text-zinc-300">
            {formatDuration(item.RunTimeTicks)}
          </span>
          {isPlayed && (
            <span className="bg-green-500/20 px-3 py-1.5 rounded-xl backdrop-blur-md border border-green-500/20 text-green-400">看过</span>
          )}
        </div>
      </div>

      {/* 详情浮层 */}
      {showInfo && (
        <div className="fixed inset-0 z-[2000] flex flex-col justify-end" onClick={() => setShowInfo(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-zinc-950 rounded-t-[32px] p-8 pb-safe border-t border-white/10 animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black text-zinc-500 uppercase tracking-widest">Metadata</h3>
              <button onClick={() => setShowInfo(false)} className="p-2 bg-white/5 rounded-full text-zinc-400"><X size={18} /></button>
            </div>
            <div className="space-y-4 max-h-[50dvh] overflow-y-auto hide-scrollbar text-white">
              <p className="font-black text-2xl">{item.Name}</p>
              <p className="text-zinc-400 text-sm leading-relaxed">{item.Overview || '暂无简介'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoItem;
