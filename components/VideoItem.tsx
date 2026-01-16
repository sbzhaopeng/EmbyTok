
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { EmbyItem, AuthData } from '../types';
import { EmbyService } from '../services/embyService';
import { Trash2, Heart, XCircle, Info, Play, AlertTriangle, FastForward, X } from 'lucide-react';

interface VideoItemProps {
  item: EmbyItem;
  auth: AuthData;
  libraryName: string; 
  isActive: boolean;
  isMuted: boolean;
  isAutoplay: boolean;
  fitMode: 'contain' | 'cover';
  onDelete: (id: string) => void;
  onDislike: (item: EmbyItem) => void;
  onEnded: () => void;
}

// 极简大方的全屏图标
const FullscreenIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* 垂直设备轮廓 */}
    <rect x="7" y="5" width="10" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
    {/* 旋转动线 */}
    <path d="M19 8C20 9.5 20.5 11 20.5 12.5C20.5 15.5 18 18 15 18.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeDasharray="2 2" />
    <path d="M14 6L11 5L14 4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const VideoItem: React.FC<VideoItemProps> = ({ 
  item, auth, isActive, isMuted, isAutoplay, fitMode, onDelete, onDislike, onEnded 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [isLiked, setIsLiked] = useState(item.UserData.IsFavorite);
  const [isLandscape, setIsLandscape] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0); 
  const [btnBottom, setBtnBottom] = useState<number | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isFastForwarding, setIsFastForwarding] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  
  const longPressTimer = useRef<number | null>(null);
  const preventClick = useRef(false);
  const emby = useMemo(() => new EmbyService(auth), [auth]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      const playPromise = video.play();
      playPromiseRef.current = playPromise;

      playPromise
        .then(() => {
          if (playPromiseRef.current === playPromise && isActive) {
            setIsPlaying(true);
          } else {
            video.pause();
          }
        })
        .catch(() => {
          setIsPlaying(false);
        });
    } else {
      if (playPromiseRef.current) {
        playPromiseRef.current.then(() => { video.pause(); setIsPlaying(false); }).catch(() => { video.pause(); setIsPlaying(false); });
      } else {
        video.pause();
        setIsPlaying(false);
      }
      setShowInfo(false);
      setDeleteStep(0);
      setPlaybackRate(1.0);
      setIsFastForwarding(false);
      setShowSpeedMenu(false);
    }
  }, [isActive]);

  const handleMetadata = () => {
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
        const targetBtnBottom = bottomSpace - 36 - 15;
        setBtnBottom(Math.max(targetBtnBottom, 45));
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isActive) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const isLeft = clientX < window.innerWidth / 2;
    preventClick.current = false;

    longPressTimer.current = window.setTimeout(() => {
      preventClick.current = true;
      if (isLeft) {
        setIsFastForwarding(true);
        if (videoRef.current) videoRef.current.playbackRate = 2.0;
      } else {
        setShowSpeedMenu(true);
      }
    }, 450);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (isFastForwarding) {
      setIsFastForwarding(false);
      if (videoRef.current) videoRef.current.playbackRate = playbackRate;
    }
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

  const formatDuration = (ticks?: number) => {
    if (!ticks) return '未知';
    const totalMinutes = Math.floor(ticks / 600000000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) return `${hours}小时${minutes}分钟`;
    return `${minutes}分钟`;
  };

  const setRate = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) videoRef.current.playbackRate = rate;
    setShowSpeedMenu(false);
  };

  const handleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    if ((video as any).webkitEnterFullscreen) {
      (video as any).webkitEnterFullscreen();
    } else if (video.requestFullscreen) {
      video.requestFullscreen();
    }
  };

  return (
    <div 
      className="relative w-full h-[100dvh] snap-start bg-black flex items-center justify-center overflow-hidden"
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-25 blur-3xl scale-125 pointer-events-none z-0"
        style={{ backgroundImage: `url(${emby.getImageUrl(item.Id, item.ImageTags.Primary)})` }}
      />

      <div className="absolute inset-0 flex items-center justify-center z-10" onClick={togglePlay}>
        <video
          ref={videoRef}
          src={emby.getVideoUrl(item.Id)}
          loop={!isAutoplay}
          onEnded={onEnded}
          onLoadedMetadata={handleMetadata}
          muted={isMuted}
          playsInline
          className={`max-w-full max-h-full pointer-events-none ${fitMode === 'contain' || isLandscape ? 'object-contain' : 'object-cover w-full h-full'}`}
        />
        
        {!isPlaying && !isFastForwarding && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/40 p-6 rounded-full backdrop-blur-md pointer-events-none">
            <Play className="w-12 h-12 fill-white text-white translate-x-1" />
          </div>
        )}
      </div>

      {/* 底部信息栏 */}
      <div className="absolute left-6 bottom-14 right-20 z-40 pb-safe pointer-events-none">
        <h2 className="text-xl font-black text-white mb-2 truncate drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">{item.Name}</h2>
        <div className="flex items-center space-x-2 text-[10px] font-black">
          <span className="bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-md border border-white/5 text-zinc-300">
            {formatDuration(item.RunTimeTicks)}
          </span>
          {(isFastForwarding || playbackRate !== 1.0) && (
            <span className="bg-red-600 px-3 py-1.5 rounded-xl text-white border border-red-500/20 animate-pulse flex items-center space-x-1">
              <FastForward size={10} className="fill-current" />
              <span>{isFastForwarding ? '2.0X' : `${playbackRate}X`}</span>
            </span>
          )}
        </div>
      </div>

      {/* 右侧交互栏 */}
      <div className="absolute right-4 bottom-20 flex flex-col items-center space-y-7 z-[999] pb-safe pointer-events-auto">
        <div className="w-12 h-12 rounded-full border-2 border-white/50 overflow-hidden shadow-2xl mb-2">
          <img src={emby.getImageUrl(item.Id, item.ImageTags.Primary)} className="w-full h-full object-cover" />
        </div>

        <button onClick={(e) => { e.stopPropagation(); const next = !isLiked; setIsLiked(next); emby.setFavorite(item.Id, next); }} className="flex flex-col items-center group active:scale-125 transition-transform">
          <Heart className={`w-8 h-8 drop-shadow-lg ${isLiked ? 'text-red-500 fill-current' : 'text-white'}`} />
          <span className="text-[10px] font-black mt-1.5 text-white">喜欢</span>
        </button>

        <button onClick={(e) => { e.stopPropagation(); onDislike(item); }} className="flex flex-col items-center group active:scale-90 transition-transform">
          <XCircle className="w-8 h-8 text-white drop-shadow-lg" />
          <span className="text-[10px] font-black mt-1.5 text-white">屏蔽</span>
        </button>

        <button 
          onClick={(e) => { e.stopPropagation(); if(deleteStep===0){setDeleteStep(1);setTimeout(()=>setDeleteStep(0),3000)}else{onDelete(item.Id)} }}
          className={`flex flex-col items-center transition-all duration-300 p-2 rounded-2xl ${deleteStep === 1 ? 'bg-red-600 scale-110 shadow-lg' : ''}`}
        >
          {deleteStep === 0 ? <Trash2 className="w-8 h-8 text-white" /> : <AlertTriangle className="w-8 h-8 text-white animate-bounce" />}
          <span className="text-[10px] font-black mt-1.5 text-white uppercase">{deleteStep === 0 ? '删除' : '确认'}</span>
        </button>

        <button onClick={(e) => { e.stopPropagation(); setShowInfo(true); }} className="flex flex-col items-center">
          <Info className={`w-8 h-8 ${showInfo ? 'text-blue-400' : 'text-white'}`} />
          <span className="text-[10px] font-black mt-1.5 text-white">详情</span>
        </button>

        <div className={`relative w-10 h-10 rounded-full border-2 p-1 transition-all ${isMuted ? 'border-red-600' : 'border-white/30'} ${isPlaying && !isMuted ? 'animate-spin-slow' : ''}`}>
          <img src={emby.getImageUrl(item.Id, item.ImageTags.Primary)} className="w-full h-full rounded-full object-cover" />
        </div>
      </div>

      {/* 极简大方的横屏全屏按钮 */}
      {isLandscape && (
        <div 
          className="absolute left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto transition-all duration-700 ease-out"
          style={{ bottom: btnBottom !== null ? `${btnBottom}px` : '42%' }}
        >
          <button 
            onClick={handleFullscreen}
            className="group flex items-center space-x-3 bg-white/5 hover:bg-white/10 active:scale-95 backdrop-blur-2xl px-6 py-3 rounded-full border border-white/10 transition-all shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
          >
            <div className="text-white/80 group-hover:text-white transition-colors">
              <FullscreenIcon />
            </div>
            <span className="text-[11px] font-bold text-white/70 group-hover:text-white uppercase tracking-[0.2em]">全屏观看</span>
          </button>
        </div>
      )}

      {/* 倍速菜单 */}
      <div className={`fixed inset-0 z-[2000] transition-opacity duration-300 ${showSpeedMenu ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSpeedMenu(false)} />
        <div className={`absolute bottom-0 left-0 right-0 bg-zinc-950 rounded-t-[40px] p-8 pb-safe border-t border-white/5 transition-transform duration-300 ${showSpeedMenu ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto mb-8" />
          <div className="grid grid-cols-4 gap-4">
            {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0].map(rate => (
              <button
                key={rate}
                onClick={() => setRate(rate)}
                className={`py-5 rounded-2xl font-black transition-all ${playbackRate === rate ? 'bg-white text-black scale-105' : 'bg-zinc-900 text-zinc-400'}`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 详情面板 */}
      <div className={`fixed inset-0 z-[2000] transition-opacity duration-300 ${showInfo ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowInfo(false)} />
        <div className={`absolute bottom-0 left-0 right-0 bg-zinc-900 rounded-t-[32px] p-8 pb-safe border-t border-white/10 transition-transform duration-300 ${showInfo ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-black text-white uppercase tracking-tight">内容详情</h3>
            <button onClick={() => setShowInfo(false)} className="p-2 bg-white/5 rounded-full"><X size={20} className="text-zinc-400" /></button>
          </div>
          <div className="space-y-4 max-h-[60dvh] overflow-y-auto hide-scrollbar">
            <div>
              <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">名称</p>
              <p className="text-white font-bold leading-relaxed">{item.Name}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">简介</p>
              <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
                {item.Overview || '暂无详细描述。'}
              </p>
            </div>
            <div className="flex space-x-8">
              <div>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">时长</p>
                <p className="text-zinc-300 text-sm font-bold">{formatDuration(item.RunTimeTicks)}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">类型</p>
                <p className="text-zinc-300 text-sm font-bold">{item.Type || '视频'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 8s linear infinite; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default VideoItem;
