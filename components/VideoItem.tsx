
import React, { useRef, useState, useEffect } from 'react';
import { EmbyItem, AuthData } from '../types';
import { EmbyService } from '../services/embyService';
import { Trash2, Heart, XCircle, Info, ScreenShare, Play } from 'lucide-react';

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
      videoRef.current?.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
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

  const togglePlay = () => {
    if (videoRef.current?.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current?.pause();
      setIsPlaying(false);
    }
  };

  const handleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current?.requestFullscreen) {
      videoRef.current.requestFullscreen();
    } else if ((videoRef.current as any).webkitEnterFullscreen) {
      // Vital for iOS support
      (videoRef.current as any).webkitEnterFullscreen();
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
      {/* 模糊背景 */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-40 blur-3xl scale-125 transition-opacity duration-700"
        style={{ backgroundImage: `url(${emby.getImageUrl(item.Id, item.ImageTags.Primary)})` }}
      />

      {/* 视频容器 */}
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
          className={`max-w-full max-h-full ${fitMode === 'contain' || isLandscape ? 'object-contain' : 'object-cover w-full h-full'}`}
        />
        
        {/* 横屏全屏特别选项：放在视频正下方 */}
        {isLandscape && (
          <button 
            onClick={handleFullscreen}
            className="mt-6 pointer-events-auto flex items-center space-x-2 bg-white/10 hover:bg-white/20 backdrop-blur-md px-6 py-2.5 rounded-full border border-white/20 active:scale-95 transition-all shadow-xl"
          >
            <ScreenShare className="w-4 h-4 text-white" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">全屏观看</span>
          </button>
        )}

        {!isPlaying && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/40 p-5 rounded-full backdrop-blur-sm border border-white/10 pointer-events-none">
            <Play className="w-10 h-10 fill-white text-white translate-x-0.5" />
          </div>
        )}
      </div>

      {/* 右侧功能链 - 不再限制权限 */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center space-y-4 z-30 pb-safe">
        <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden shadow-2xl mb-1">
          <img src={emby.getImageUrl(item.Id, item.ImageTags.Primary)} className="w-full h-full object-cover" />
        </div>

        <button onClick={handleLike} className="flex flex-col items-center">
          <Heart className={`w-8 h-8 drop-shadow-lg transition-all ${isLiked ? 'text-red-500 fill-current scale-110' : 'text-white'}`} />
          <span className="text-[10px] font-bold mt-1 text-white drop-shadow-md">喜欢</span>
        </button>

        <button onClick={(e) => { e.stopPropagation(); onDislike(item); }} className="flex flex-col items-center">
          <XCircle className="w-8 h-8 text-white drop-shadow-lg" />
          <span className="text-[10px] font-bold mt-1 text-white drop-shadow-md">不喜欢</span>
        </button>

        <button onClick={(e) => { e.stopPropagation(); if(confirm('彻底从服务器删除该视频？此操作不可逆。')) onDelete(item.Id); }} className="flex flex-col items-center">
          <Trash2 className="w-8 h-8 text-white drop-shadow-lg" />
          <span className="text-[10px] font-bold mt-1 text-white drop-shadow-md">删除</span>
        </button>

        <button onClick={(e) => { e.stopPropagation(); setShowInfo(!showInfo); }} className="flex flex-col items-center">
          <Info className={`w-8 h-8 drop-shadow-lg ${showInfo ? 'text-blue-400' : 'text-white'}`} />
          <span className="text-[10px] font-bold mt-1 text-white drop-shadow-md">信息</span>
        </button>

        <div className={`relative w-9 h-9 rounded-full border-2 p-0.5 transition-all duration-500 ${isMuted ? 'border-red-600' : 'border-zinc-400'} ${isPlaying && !isMuted ? 'animate-spin-slow' : ''}`}>
          <img src={emby.getImageUrl(item.Id, item.ImageTags.Primary)} className="w-full h-full rounded-full object-cover" />
        </div>
      </div>

      <div className="absolute left-4 bottom-8 right-16 z-20 pointer-events-none pb-safe">
        <div className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          <h2 className="text-xl font-bold text-white mb-1 truncate">{item.Name}</h2>
          <div className="flex items-center space-x-2 text-xs font-bold text-zinc-300">
             <span className="bg-white/20 px-2 py-0.5 rounded backdrop-blur-md">
               {item.RunTimeTicks ? `${Math.floor(item.RunTimeTicks / 600000000)}m` : 'N/A'}
             </span>
             <span className="text-zinc-400">|</span>
             <span className="uppercase tracking-wide">{item.Type}</span>
          </div>
          <div className={`mt-3 overflow-hidden transition-all duration-500 ${showInfo ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="bg-black/50 backdrop-blur-lg p-3 rounded-xl border border-white/10 pointer-events-auto">
              <p className="text-xs text-zinc-200 leading-relaxed line-clamp-6">
                {item.Overview || '暂无详细介绍'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 6s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default VideoItem;
