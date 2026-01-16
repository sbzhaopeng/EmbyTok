import React, { useRef, useState, useEffect, useMemo } from 'react';
import { EmbyItem, AuthData } from '../types';
import { EmbyService } from '../services/embyService';
import { Trash2, Heart, XCircle, Info, AlertTriangle, X, Loader2, Maximize } from 'lucide-react';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<number | null>(null);
  const deleteTimerRef = useRef<number | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [isLiked, setIsLiked] = useState(item.UserData.IsFavorite);
  const [isLandscape, setIsLandscape] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0);
  const [isPlayed, setIsPlayed] = useState(item.UserData.PlayCount > 0);
  
  const [playbackRate, setPlaybackRate] = useState(1.0); 
  const [isFastForwarding, setIsFastForwarding] = useState(false); 
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isLongPressed, setIsLongPressed] = useState(false); 

  const emby = useMemo(() => new EmbyService(auth), [auth]);
  const posterUrl = emby.getImageUrl(item.Id, item.ImageTags.Primary);

  const syncRate = () => {
    if (videoRef.current) {
      const target = isFastForwarding ? 2.0 : playbackRate;
      if (videoRef.current.playbackRate !== target) {
        videoRef.current.playbackRate = target;
      }
    }
  };

  useEffect(() => { syncRate(); }, [playbackRate, isFastForwarding]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      resetDeleteState();
      setPlaybackRate(1.0);
      setIsFastForwarding(false);
      setIsLongPressed(false);
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setIsPlaying(true);
          syncRate();
        }).catch(() => setIsPlaying(false));
      }
    } else {
      video.pause();
      setIsPlaying(false);
      resetDeleteState();
    }
  }, [isActive]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleExitFullscreen = () => {
      if (isActive) {
        // 适当增加延迟以覆盖 iOS 原生播放器的自动暂停动作
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.play().then(() => {
              setIsPlaying(true);
            }).catch(() => {
              setIsPlaying(true);
            });
          }
        }, 300);
      }
    };

    video.addEventListener('webkitendfullscreen', handleExitFullscreen);
    video.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement) handleExitFullscreen();
    });

    return () => {
      if (video) {
        video.removeEventListener('webkitendfullscreen', handleExitFullscreen);
        video.removeEventListener('fullscreenchange', handleExitFullscreen);
      }
    };
  }, [isActive]);

  const resetDeleteState = () => {
    setDeleteStep(0);
    if (deleteTimerRef.current) {
      window.clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isActive) return;
    const width = window.innerWidth;
    const x = e.clientX;
    const sideZone = width * 0.1; // 屏幕两侧 10% 区域

    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    
    longPressTimer.current = window.setTimeout(() => {
      setIsLongPressed(true);
      
      if (x < sideZone || x > width - sideZone) {
        // 两侧 10% 区域：2.0x 倍速播放
        setIsFastForwarding(true);
      } else {
        // 中间 80% 区域：弹出倍速菜单
        setShowSpeedMenu(true);
      }
    }, 450);
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (isFastForwarding) {
      setIsFastForwarding(false);
    }
  };

  const togglePlay = () => {
    if (isLongPressed) {
      setIsLongPressed(false);
      return;
    }
    if (showSpeedMenu) return;
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true));
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    try {
      if (video.requestFullscreen) {
        video.requestFullscreen();
      } else if ((video as any).webkitEnterFullscreen) {
        (video as any).webkitEnterFullscreen();
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  };

  const formatDuration = (ticks?: number) => {
    if (!ticks) return '0:00';
    const totalSeconds = Math.floor(ticks / 10000000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[100dvh] snap-start bg-black flex flex-col items-center justify-center overflow-hidden"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <style>{`
        @keyframes rotate-cd { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-cd { animation: rotate-cd 5s linear infinite; }
        @keyframes ios-play-reveal { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .ios-play-btn { animation: ios-play-reveal 0.2s cubic-bezier(0.2, 0, 0, 1) forwards; }
      `}</style>

      <div className="absolute inset-0 opacity-20 blur-3xl scale-110 pointer-events-none z-0" style={{ backgroundImage: `url(${posterUrl})`, backgroundSize: 'cover' }} />

      <div className="relative z-10 flex flex-col items-center w-full h-full justify-center" onClick={togglePlay}>
        <div className="relative flex items-center justify-center w-full max-h-full">
          <video
            ref={videoRef}
            src={emby.getVideoUrl(item.Id)}
            loop
            onEnded={() => { emby.markAsPlayed(item.Id); setIsPlayed(true); onEnded(); }}
            onLoadedMetadata={() => { setIsLoading(false); setIsLandscape((videoRef.current?.videoWidth || 0) > (videoRef.current?.videoHeight || 0)); }}
            onWaiting={() => setIsLoading(true)}
            onPlaying={() => { setIsLoading(false); setIsPlaying(true); syncRate(); }}
            onPause={() => setIsPlaying(false)}
            onRateChange={syncRate}
            muted={isMuted}
            playsInline
            className={`max-w-full max-h-[100dvh] pointer-events-none transition-transform duration-500 ${fitMode === 'contain' || isLandscape ? 'object-contain' : 'object-cover w-full h-full'}`}
          />
          
          {isLoading && isActive && <Loader2 className="absolute w-10 h-10 text-white animate-spin opacity-40" />}

          {!isPlaying && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/5 pointer-events-none">
              <div className="ios-play-btn w-20 h-20 bg-black/20 backdrop-blur-xl rounded-full border border-white/20 flex items-center justify-center shadow-2xl">
                <div className="ml-1 w-0 h-0 border-t-[14px] border-t-transparent border-l-[24px] border-l-white border-b-[14px] border-b-transparent rounded-sm drop-shadow-lg" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="absolute right-4 bottom-20 flex flex-col items-center space-y-6 z-[90] pb-safe">
        <div className="w-12 h-12 rounded-full border-2 border-white/80 overflow-hidden shadow-2xl bg-zinc-900 active:scale-90 transition-transform">
          <img src={posterUrl} className="w-full h-full object-cover" alt="p" />
        </div>
        
        <button onClick={(e) => { e.stopPropagation(); setIsLiked(!isLiked); emby.setFavorite(item.Id, !isLiked); }} className="flex flex-col items-center active:scale-125 transition-transform">
          <Heart className={`w-8 h-8 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${isLiked ? 'text-red-500 fill-current' : 'text-white'}`} />
          <span className="text-[10px] font-black mt-1 text-white shadow-black drop-shadow-md">喜欢</span>
        </button>

        <button onClick={(e) => { e.stopPropagation(); onDislike(item); }} className="flex flex-col items-center active:scale-90 transition-transform text-white">
          <XCircle className="w-8 h-8 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
          <span className="text-[10px] font-black mt-1 shadow-black drop-shadow-md">不喜欢</span>
        </button>

        <button 
          onClick={(e) => { e.stopPropagation(); if(deleteStep===0) { setDeleteStep(1); deleteTimerRef.current = window.setTimeout(()=>setDeleteStep(0),3000); } else { onDelete(item.Id); } }}
          className={`flex flex-col items-center transition-all p-2 rounded-2xl ${deleteStep === 1 ? 'bg-red-600 scale-110 shadow-lg' : ''}`}
        >
          {deleteStep === 0 ? <Trash2 className="w-8 h-8 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" /> : <AlertTriangle className="w-8 h-8 text-white animate-pulse" />}
          <span className="text-[10px] font-black mt-1 text-white uppercase drop-shadow-md">{deleteStep === 0 ? '删除' : '确认'}</span>
        </button>

        <button onClick={handleFullscreen} className="flex flex-col items-center active:scale-90 transition-transform text-white">
          <Maximize className="w-8 h-8 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
          <span className="text-[10px] font-black mt-1 shadow-black drop-shadow-md">全屏</span>
        </button>

        <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center mt-4 transition-all duration-500 shadow-2xl bg-zinc-900 overflow-hidden ${isMuted ? 'border-red-600 scale-90 opacity-60' : 'border-white'} ${isPlaying && !isMuted ? 'animate-cd' : ''}`}>
          <img src={posterUrl} className="w-full h-full object-cover rounded-full" alt="cd" />
        </div>
      </div>

      <div className="absolute left-6 bottom-12 right-24 z-40 pb-safe pointer-events-none text-white">
        <h2 className="text-xl font-black mb-2 truncate drop-shadow-[0_2px_8px_rgba(0,0,0,1)] tracking-tight">{item.Name}</h2>
        <div className="flex items-center space-x-3 text-[10px] font-black">
          <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,1)] text-zinc-100 flex items-center">
            {formatDuration(item.RunTimeTicks)}
          </span>

          <button 
            onClick={(e) => { e.stopPropagation(); setShowInfo(true); }} 
            className="pointer-events-auto flex items-center space-x-1 active:opacity-60 transition-opacity"
          >
            <Info size={14} className="drop-shadow-[0_2px_4px_rgba(0,0,0,1)]" />
            <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,1)] text-zinc-100">详情</span>
          </button>

          {(isFastForwarding || playbackRate !== 1.0) && (
            <span className={`px-2 py-0.5 rounded-lg uppercase shadow-xl transition-all duration-200 ${isFastForwarding ? 'bg-red-600/80 animate-pulse' : 'bg-blue-600/80'}`}>
              {isFastForwarding ? '2.0倍速播放' : `${playbackRate}倍速播放`}
            </span>
          )}

          {isPlayed && (
            <span className="text-green-400 drop-shadow-[0_2px_4px_rgba(0,0,0,1)] flex items-center">
              • 看过
            </span>
          )}
        </div>
      </div>

      {showInfo && (
        <div className="fixed inset-0 z-[2000] flex flex-col justify-end" onClick={() => setShowInfo(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-zinc-950 rounded-t-[32px] p-8 pb-safe border-t border-white/10 animate-in slide-in-from-bottom shadow-2xl text-white" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest">媒体详情</h3>
              <button onClick={() => setShowInfo(false)} className="p-2"><X size={18} /></button>
            </div>
            <div className="space-y-4 max-h-[50dvh] overflow-y-auto pb-10">
              <p className="font-black text-2xl italic leading-tight">{item.Name}</p>
              <p className="text-zinc-400 text-sm leading-relaxed">{item.Overview || '暂无简介'}</p>
            </div>
          </div>
        </div>
      )}

      {showSpeedMenu && (
        <div className="fixed inset-0 z-[2001] flex flex-col justify-end" onClick={() => setShowSpeedMenu(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-zinc-900 rounded-t-[40px] p-8 pb-safe border-t border-white/5 animate-in slide-in-from-bottom" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">选择播放速率</h3>
              <button onClick={() => setShowSpeedMenu(false)} className="p-2 text-zinc-500"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0].map(s => (
                <button key={s} onClick={() => { setPlaybackRate(s); setShowSpeedMenu(false); setIsLongPressed(true); }} className={`py-4 rounded-2xl font-black text-xs border transition-all ${playbackRate === s ? 'bg-white text-black border-white shadow-xl scale-105' : 'bg-white/5 text-white border-white/5 active:bg-white/10'}`}>{s}x</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoItem;