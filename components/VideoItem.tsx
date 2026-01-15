
import React, { useRef, useState, useEffect } from 'react';
import { EmbyItem, AuthData } from '../types';
import { EmbyService } from '../services/embyService';
import { Trash2, Heart, XCircle, Info, Play } from 'lucide-react';

interface VideoItemProps {
  item: EmbyItem;
  auth: AuthData;
  isActive: boolean;
  isMuted: boolean;
  isAutoplay: boolean;
  fitMode: 'contain' | 'cover';
  onDelete: (id: string) => void;
  onDislike: (item: EmbyItem) => void;
  onEnded: () => void;
}

// 优化的全屏图标
const ScreenRotateIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 2H5C3.34315 2 2 3.34315 2 5V7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M17 2H19C20.6569 2 22 3.34315 22 5V7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M7 22H5C3.34315 22 2 20.6569 2 19V17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M17 22H19C20.6569 22 22 20.6569 22 19V17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    <rect x="6" y="9" width="12" height="6" rx="1.5" stroke="currentColor" strokeWidth="2" opacity="0.6"/>
  </svg>
);

const VideoItem: React.FC<VideoItemProps> = ({ 
  item, auth, isActive, isMuted, isAutoplay, fitMode, onDelete, onDislike, onEnded 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [isLiked, setIsLiked] = useState(item.UserData.IsFavorite);
  const [isLandscape, setIsLandscape] = useState(false);
  const emby = new EmbyService(auth);

  useEffect(() => {
    if (isActive) {
      videoRef.current?.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      videoRef.current?.pause();
      setIsPlaying(false);
      setShowInfo(false);
    }
  }, [isActive]);

  const handleMetadata = () => {
    if (videoRef.current) {
      const landscape = videoRef.current.videoWidth > videoRef.current.videoHeight;
      setIsLandscape(landscape);
    }
  };

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current?.paused) {
      videoRef.current.play().then(() => setIsPlaying(true));
    } else {
      videoRef.current?.pause();
      setIsPlaying(false);
    }
  };

  const handleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    // iOS 专用全屏触发
    if ((video as any).webkitEnterFullscreen) {
      (video as any).webkitEnterFullscreen();
    } else if (video.requestFullscreen) {
      video.requestFullscreen();
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !isLiked;
    setIsLiked(next);
    await emby.setFavorite(item.Id, next);
  };

  return (
    <div className="relative w-full h-[100dvh] snap-start bg-black flex items-center justify-center overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30 blur-3xl scale-125 pointer-events-none"
        style={{ backgroundImage: `url(${emby.getImageUrl(item.Id, item.ImageTags.Primary)})` }}
      />

      <div className="relative w-full h-full flex flex-col items-center justify-center z-10" onClick={togglePlay}>
        <video
          ref={videoRef}
          src={emby.getVideoUrl(item.Id)}
          loop={!isAutoplay}
          onEnded={onEnded}
          onLoadedMetadata={handleMetadata}
          muted={isMuted}
          playsInline
          webkit-playsinline="true"
          className={`max-w-full max-h-full pointer-events-none ${fitMode === 'contain' || isLandscape ? 'object-contain' : 'object-cover w-full h-full'}`}
        />
        
        {isLandscape && (
          <button 
            onClick={handleFullscreen}
            className="mt-6 flex items-center space-x-2.5 bg-white/15 active:scale-95 backdrop-blur-3xl px-6 py-2.5 rounded-2xl border border-white/20 transition-all shadow-2xl z-50 pointer-events-auto"
          >
            <ScreenRotateIcon />
            <span className="text-xs font-black text-white uppercase tracking-widest">全屏观看</span>
          </button>
        )}

        {!isPlaying && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/40 p-6 rounded-full backdrop-blur-md border border-white/10 pointer-events-none">
            <Play className="w-12 h-12 fill-white text-white translate-x-1" />
          </div>
        )}
      </div>

      <div className="absolute right-3 bottom-24 flex flex-col items-center space-y-5 z-30 pb-safe">
        <div className="w-12 h-12 rounded-full border-2 border-white/50 overflow-hidden shadow-2xl mb-2">
          <img src={emby.getImageUrl(item.Id, item.ImageTags.Primary)} className="w-full h-full object-cover" />
        </div>

        <button onClick={handleLike} className="group flex flex-col items-center">
          <Heart className={`w-8 h-8 drop-shadow-lg transition-all active:scale-125 ${isLiked ? 'text-red-500 fill-current' : 'text-white'}`} />
          <span className="text-[10px] font-bold mt-1 text-white drop-shadow-md">喜欢</span>
        </button>

        <button onClick={(e) => { e.stopPropagation(); onDislike(item); }} className="flex flex-col items-center">
          <XCircle className="w-8 h-8 text-white drop-shadow-lg active:scale-90" />
          <span className="text-[10px] font-bold mt-1 text-white drop-shadow-md">不喜欢</span>
        </button>

        <button 
          onClick={(e) => { 
            e.stopPropagation(); 
            if(window.confirm('警告：确认从 Emby 服务器完全删除该视频文件？')) {
              onDelete(item.Id);
            }
          }} 
          className="flex flex-col items-center"
        >
          <Trash2 className="w-8 h-8 text-white drop-shadow-lg active:scale-90" />
          <span className="text-[10px] font-bold mt-1 text-white drop-shadow-md">删除</span>
        </button>

        <button onClick={(e) => { e.stopPropagation(); setShowInfo(!showInfo); }} className="flex flex-col items-center">
          <Info className={`w-8 h-8 drop-shadow-lg ${showInfo ? 'text-blue-400' : 'text-white'}`} />
          <span className="text-[10px] font-bold mt-1 text-white drop-shadow-md">详情</span>
        </button>

        <div className={`relative w-10 h-10 rounded-full border-2 p-1 transition-all duration-700 ${isMuted ? 'border-red-600' : 'border-white/30'} ${isPlaying && !isMuted ? 'animate-spin-slow' : ''}`}>
          <img src={emby.getImageUrl(item.Id, item.ImageTags.Primary)} className="w-full h-full rounded-full object-cover" />
        </div>
      </div>

      <div className="absolute left-4 bottom-8 right-16 z-20 pointer-events-none pb-safe">
        <div className="drop-shadow-[0_2px_10px_rgba(0,0,0,1)]">
          <h2 className="text-xl font-black text-white mb-2 truncate">{item.Name}</h2>
          <div className="flex items-center space-x-3 text-[10px] font-black text-zinc-300">
             <span className="bg-white/10 px-2 py-1 rounded backdrop-blur-md border border-white/10 uppercase">
               {item.RunTimeTicks ? `${Math.floor(item.RunTimeTicks / 600000000)} MIN` : 'N/A'}
             </span>
             <span className="bg-red-600/20 text-red-400 px-2 py-1 rounded border border-red-500/20 uppercase">
               {item.Type}
             </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 8s linear infinite; }
      `}</style>
    </div>
  );
};

export default VideoItem;
