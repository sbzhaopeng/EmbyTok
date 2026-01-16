
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { EmbyItem, AuthData } from '../types';
import { EmbyService } from '../services/embyService';
import { Trash2, Heart, XCircle, Info, Play, AlertTriangle, FastForward, X, Maximize, Loader2, CheckCircle2 } from 'lucide-react';

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
  const [btnBottom, setBtnBottom] = useState<number | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isFastForwarding, setIsFastForwarding] = useState(false);
  const [isPlayed, setIsPlayed] = useState(item.UserData.PlayCount > 0);
  
  const longPressTimer = useRef<number | null>(null);
  const deleteTimerRef = useRef<number | null>(null);
  const preventClick = useRef(false);
  const emby = useMemo(() => new EmbyService(auth), [auth]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
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
      setPlaybackRate(1.0);
      setIsFastForwarding(false);
    }
  }, [isActive]);

  const resetDeleteState = () => {
    setDeleteStep(0);
    if (deleteTimerRef.current) {
      window.clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }
  };

  const formatDuration = (ticks?: number) => {
    if (!ticks) return '未知时长';
    const totalSeconds = Math.floor(ticks / 10000000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleMetadata = () => {
    setIsLoading(false);
    if (videoRef.current) {
      const { videoWidth, videoHeight } = videoRef.current;
      const landscape = videoWidth > videoHeight;
      setIsLandscape(landscape);

      if (landscape) {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const actualVideoHeight = screenWidth * (videoHeight / videoWidth);
        const topSpace = (screenHeight - actualVideoHeight) / 2;
        const bottomSpace = screenHeight - (topSpace + actualVideoHeight);
        setBtnBottom(Math.max(bottomSpace - 36 - 15, 45));
      }
    }
  };

  const handleVideoEnded = () => {
    emby.markAsPlayed(item.Id);
    setIsPlayed(true);
    onEnded();
  };

  const togglePlay = () => {
    if (preventClick.current) return;
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (deleteStep === 0) {
      setDeleteStep(1);
      deleteTimerRef.current = window.setTimeout(() => {
        setDeleteStep(0);
        deleteTimerRef.current = null;
      }, 4000);
    } else {
      onDelete(item.Id);
      resetDeleteState();
    }
  };

  return (
    <div 
      className="relative w-full h-[100dvh] snap-start bg-black flex items-center justify-center overflow-hidden"
      onMouseDown={(e) => {
        if (!isActive) return;
        preventClick.current = false;
        longPressTimer.current = window.setTimeout(() => {
          preventClick.current = true;
          setIsFastForwarding(true);
          if (videoRef.current) videoRef.current.playbackRate = 2.0;
        }, 450);
      }}
      onMouseUp={() => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
        if (isFastForwarding) {
          setIsFastForwarding(false);
          if (videoRef.current) videoRef.current.playbackRate = playbackRate;
        }
      }}
    >
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-20 blur-3xl scale-110 pointer-events-none z-0"
        style={{ backgroundImage: `url(${emby.getImageUrl(item.Id, item.ImageTags.Primary)})` }}
      />

      <div className="absolute inset-0 flex items-center justify-center z-10" onClick={togglePlay}>
        <video
          ref={videoRef}
          src={emby.getVideoUrl(item.Id)}
          loop={!isAutoplay}
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

        {!isPlaying && !isFastForwarding && !isLoading && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/40 p-6 rounded-full backdrop-blur-md pointer-events-none animate-in fade-in zoom-in duration-200">
            <Play className="w-12 h-12 fill-white text-white translate-x-1" />
          </div>
        )}
      </div>

      <div className="absolute left-6 bottom-10 right-20 z-40 pb-safe pointer-events-none">
        <h2 className="text-xl font-black text-white mb-2 truncate drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">{item.Name}</h2>
        <div className="flex items-center space-x-2 text-[10px] font-black">
          <span className="bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-md border border-white/5 text-zinc-300">
            {formatDuration(item.RunTimeTicks)}
          </span>
          {isPlayed && (
            <span className="bg-green-500/20 px-3 py-1.5 rounded-xl backdrop-blur-md border border-green-500/20 text-green-400 flex items-center gap-1">
              <CheckCircle2 size={10} />
              看过
            </span>
          )}
          {isFastForwarding && (
            <span className="bg-red-600 px-3 py-1.5 rounded-xl text-white animate-pulse">2.0X 倍速中</span>
          )}
        </div>
      </div>

      <div className="absolute right-4 bottom-16 flex flex-col items-center space-y-7 z-[999] pb-safe pointer-events-auto">
        {/* 顶部圆形海报：白色实线边框 */}
        <div className="relative w-11 h-11 rounded-full border-2 border-white p-0.5 mb-1">
          <img 
            src={emby.getImageUrl(item.Id, item.ImageTags.Primary)} 
            className="w-full h-full rounded-full object-cover shadow-lg" 
            alt="poster"
          />
        </div>

        <button onClick={(e) => { e.stopPropagation(); const next = !isLiked; setIsLiked(next); emby.setFavorite(item.Id, next); }} className="flex flex-col items-center active:scale-125 transition-transform">
          <Heart className={`w-8 h-8 drop-shadow-lg ${isLiked ? 'text-red-500 fill-current' : 'text-white'}`} />
          <span className="text-[10px] font-black mt-1.5 text-white shadow-sm">喜欢</span>
        </button>

        <button onClick={(e) => { e.stopPropagation(); onDislike(item); }} className="flex flex-col items-center active:scale-90 transition-transform">
          <XCircle className="w-8 h-8 text-white drop-shadow-lg" />
          <span className="text-[10px] font-black mt-1.5 text-white shadow-sm">屏蔽</span>
        </button>

        <button 
          onClick={handleDeleteClick}
          className={`flex flex-col items-center transition-all duration-300 p-2 rounded-2xl ${deleteStep === 1 ? 'bg-red-600 scale-110 shadow-lg' : 'hover:bg-white/10'}`}
        >
          {deleteStep === 0 ? (
            <Trash2 className="w-8 h-8 text-white drop-shadow-lg" />
          ) : (
            <AlertTriangle className="w-8 h-8 text-white animate-pulse" />
          )}
          <span className="text-[10px] font-black mt-1.5 text-white uppercase tracking-tighter">
            {deleteStep === 0 ? '删除' : '确认'}
          </span>
        </button>

        <button onClick={(e) => { e.stopPropagation(); setShowInfo(true); }} className="flex flex-col items-center">
          <Info className={`w-8 h-8 ${showInfo ? 'text-blue-400' : 'text-white'} drop-shadow-lg`} />
          <span className="text-[10px] font-black mt-1.5 text-white shadow-sm">详情</span>
        </button>

        {/* 底部唱片/静音标志：静音红色且不转，不静音白色且随播放转动 */}
        <div className={`relative w-10 h-10 rounded-full border-2 p-1 transition-all ${isMuted ? 'border-red-600' : 'border-white'} ${isPlaying && !isMuted ? 'animate-spin-slow' : ''}`}>
          <img 
            src={emby.getImageUrl(item.Id, item.ImageTags.Primary)} 
            className="w-full h-full rounded-full object-cover shadow-lg" 
            alt="disc"
          />
        </div>
      </div>

      {isLandscape && (
        <div 
          className="absolute left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto"
          style={{ bottom: btnBottom !== null ? `${btnBottom}px` : '40%' }}
        >
          <button 
            onClick={(e) => {
              e.stopPropagation();
              const v = videoRef.current;
              if (v) v.requestFullscreen?.() || (v as any).webkitEnterFullscreen?.();
            }}
            className="flex items-center space-x-3 bg-zinc-950/40 backdrop-blur-3xl px-8 py-3.5 rounded-full border border-white/5 active:scale-95 transition-all shadow-2xl"
          >
            <Maximize size={18} className="text-white/80" />
            <span className="text-[11px] font-black text-white/70 uppercase tracking-[0.2em]">全屏观看</span>
          </button>
        </div>
      )}

      {showInfo && (
        <div className="fixed inset-0 z-[2000] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowInfo(false)} />
          <div className="relative bg-zinc-900 rounded-t-[32px] p-8 pb-safe border-t border-white/10 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-white uppercase tracking-tight">内容详情</h3>
              <button onClick={() => setShowInfo(false)} className="p-2 bg-white/5 rounded-full text-zinc-400"><X size={20} /></button>
            </div>
            <div className="space-y-4 max-h-[50dvh] overflow-y-auto hide-scrollbar text-white font-medium">
              <p className="font-black text-xl">{item.Name}</p>
              <div className="flex gap-4 text-xs text-zinc-400 uppercase tracking-widest font-bold">
                <span>{formatDuration(item.RunTimeTicks)}</span>
              </div>
              <p className="text-zinc-300 text-sm leading-relaxed pt-2">{item.Overview || '此视频暂无简介。'}</p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 10s linear infinite; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default VideoItem;
