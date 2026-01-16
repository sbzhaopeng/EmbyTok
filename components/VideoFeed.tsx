import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { EmbyItem, AuthData, DislikedItem, Library } from '../types';
import { EmbyService } from '../services/embyService';
import VideoItem from './VideoItem';
import Settings from './Settings';
import { VolumeX, Volume2, Layout, LayoutGrid, Menu, X, Loader2, Check, Settings as SettingsIcon, PlayCircle } from 'lucide-react';

interface VideoFeedProps {
  auth: AuthData;
  onOpenSettings: () => void;
}

type Category = 'Random' | 'DateCreated' | 'IsFavorite';
type DisplayMode = 'player' | 'grid';

const VideoFeed: React.FC<VideoFeedProps> = ({ auth }) => {
  const [items, setItems] = useState<EmbyItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isAutoplay, setIsAutoplay] = useState(true);
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain');
  const [category, setCategory] = useState<Category>('Random');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('player');
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [selectedLib, setSelectedLib] = useState<string>('');
  const [showLibMenu, setShowLibMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const emby = useMemo(() => new EmbyService(auth), [auth]);

  const libraryMap = useMemo(() => {
    const map = new Map<string, string>();
    libraries.forEach(lib => map.set(lib.Id, lib.Name));
    return map;
  }, [libraries]);

  const fetchData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true);
        setItems([]);
      }
      
      const dataItems = await emby.getItems({
        sortBy: category,
        filter: category === 'IsFavorite' ? 'IsFavorite' : undefined,
        parentId: selectedLib || undefined,
        limit: 15
      });
      
      const dislikedList: DislikedItem[] = JSON.parse(localStorage.getItem('disliked_items') || '[]');
      const dislikedIds = new Set(dislikedList.map(d => d.id));
      const filtered = Array.isArray(dataItems) ? dataItems.filter(item => !dislikedIds.has(item.Id)) : [];

      setItems(prev => isInitial ? filtered : [...prev, ...filtered]);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [emby, category, selectedLib]);

  useEffect(() => {
    fetchData(true);
  }, [category, selectedLib, fetchData]);

  useEffect(() => {
    emby.getLibraries().then(setLibraries).catch(console.error);
  }, [emby]);

  const getLibDisplayName = (item: EmbyItem) => {
    if (selectedLib) return libraryMap.get(selectedLib) || '媒体库';
    if (item.ParentId && libraryMap.has(item.ParentId)) return libraryMap.get(item.ParentId);
    return '媒体库';
  };

  const handleScroll = () => {
    if (!containerRef.current || displayMode === 'grid') return;
    const scrollPos = containerRef.current.scrollTop;
    const height = containerRef.current.clientHeight;
    if (height <= 0) return;
    
    const index = Math.round(scrollPos / height);
    if (index !== activeIndex && index >= 0 && index < items.length) {
      setActiveIndex(index);
    }
    if (index >= items.length - 3 && items.length > 0 && !loading) {
      fetchData(false);
    }
  };

  const handleEnded = () => {
    if (isAutoplay && containerRef.current && activeIndex < items.length - 1) {
      const height = containerRef.current.clientHeight;
      containerRef.current.scrollTo({ top: (activeIndex + 1) * height, behavior: 'smooth' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const success = await emby.deleteItem(id);
      if (success) {
        setItems(prev => prev.filter(i => i.Id !== id));
        if (items.length <= 1) fetchData(true);
      } else {
        alert('删除失败：请检查权限。');
      }
    } catch (err) {
      console.error('删除过程出错:', err);
    }
  };

  const jumpToVideo = (index: number) => {
    setActiveIndex(index);
    setDisplayMode('player');
    setTimeout(() => {
      if (containerRef.current) {
        const height = containerRef.current.clientHeight;
        containerRef.current.scrollTop = index * height;
      }
    }, 100);
  };

  if (showSettings) {
    return <Settings auth={auth} onBack={() => setShowSettings(false)} onLogout={() => { localStorage.removeItem('emby_tok_auth'); window.location.reload(); }} />;
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <div className="absolute top-0 left-0 right-0 z-[1100] flex items-center justify-between px-4 pt-safe h-20 bg-gradient-to-b from-black/80 via-black/20 to-transparent">
        <button onClick={() => setShowLibMenu(true)} className="text-white p-2 active:scale-90 transition-transform">
          <Menu className="w-6 h-6 drop-shadow-lg" />
        </button>
        
        <div className="flex items-center space-x-6">
          {(['IsFavorite', 'DateCreated', 'Random'] as Category[]).map(cat => (
            <button 
              key={cat} 
              onClick={() => { 
                if (category === cat) {
                   fetchData(true); // 如果已是当前分类，强制刷新
                } else {
                   setCategory(cat); 
                }
                setDisplayMode('player'); 
              }} 
              className={`relative text-sm font-black transition-all drop-shadow-lg ${category === cat ? 'text-white scale-110' : 'text-zinc-400'}`}
            >
              {cat === 'IsFavorite' ? '喜欢' : cat === 'DateCreated' ? '最新' : '随机'}
              {category === cat && <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-red-600 rounded-full" />}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-3">
          <button onClick={() => setIsMuted(!isMuted)} className="text-white p-1 active:scale-90 transition-transform">
            {isMuted ? <VolumeX className="w-5 h-5 drop-shadow-lg" /> : <Volume2 className="w-5 h-5 text-red-500 drop-shadow-lg" />}
          </button>
          <button onClick={() => setDisplayMode(displayMode === 'player' ? 'grid' : 'player')} className="text-white p-1 active:scale-90 transition-transform">
            {displayMode === 'player' ? <LayoutGrid className="w-5 h-5 drop-shadow-lg" /> : <Layout className="w-5 h-5 text-red-500 drop-shadow-lg" />}
          </button>
        </div>
      </div>

      <div className={`fixed inset-0 z-[1200] transition-opacity duration-300 ${showLibMenu ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowLibMenu(false)} />
        <div className={`fixed left-0 top-0 bottom-0 w-72 bg-zinc-950 flex flex-col shadow-2xl transition-transform duration-300 ${showLibMenu ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex-1 overflow-y-auto px-6 pt-[calc(var(--sat)+1.5rem)] pb-8">
            <div className="flex items-center justify-between mb-8 text-white">
              <h3 className="font-black text-lg uppercase tracking-tighter italic">媒体库</h3>
              <button onClick={() => setShowLibMenu(false)} className="p-2"><X className="text-zinc-400" /></button>
            </div>
            <div className="space-y-2">
              <button onClick={() => { setSelectedLib(''); setShowLibMenu(false); }} className={`w-full flex items-center justify-between p-4 rounded-2xl font-black transition-all ${selectedLib === '' ? 'bg-red-600 text-white' : 'bg-zinc-900/50 text-zinc-500 border border-white/5'}`}>
                <span>全部媒体库</span>
                {selectedLib === '' && <Check size={16} />}
              </button>
              {libraries.map(lib => (
                <button key={lib.Id} onClick={() => { setSelectedLib(lib.Id); setShowLibMenu(false); }} className={`w-full flex items-center justify-between p-4 rounded-2xl font-black transition-all ${selectedLib === lib.Id ? 'bg-red-600 text-white' : 'bg-zinc-900/50 text-zinc-500 border border-white/5'}`}>
                  <span className="truncate">{lib.Name}</span>
                  {selectedLib === lib.Id && <Check size={16} />}
                </button>
              ))}
            </div>
          </div>
          <div className="p-6 border-t border-white/5 bg-zinc-950 pb-safe">
             <button onClick={() => { setShowSettings(true); setShowLibMenu(false); }} className="w-full flex items-center justify-center space-x-2 py-4 bg-zinc-900 rounded-2xl text-white font-black border border-white/5 active:scale-95 transition-all">
                <SettingsIcon size={18} />
                <span>系统设置</span>
             </button>
          </div>
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center bg-black">
          <Loader2 className="w-10 h-10 text-red-600 animate-spin mb-4" />
          <p className="text-zinc-600 text-[10px] tracking-[0.4em] uppercase font-black">同步媒体资产...</p>
        </div>
      ) : displayMode === 'player' ? (
        <div ref={containerRef} onScroll={handleScroll} className="w-full h-full overflow-y-scroll snap-y snap-mandatory hide-scrollbar">
          {items.map((item, index) => (
            <VideoItem 
              key={`${item.Id}-${index}`}
              item={item} 
              auth={auth}
              libraryName={getLibDisplayName(item)}
              isActive={index === activeIndex}
              isNext={index === activeIndex + 1}
              isMuted={isMuted}
              isAutoplay={isAutoplay}
              fitMode={fitMode}
              onEnded={handleEnded}
              onDelete={handleDelete}
              onDislike={item => {
                const list = JSON.parse(localStorage.getItem('disliked_items') || '[]');
                list.push({ id: item.Id, name: item.Name, addedAt: Date.now() });
                localStorage.setItem('disliked_items', JSON.stringify(list));
                setItems(prev => prev.filter(i => i.Id !== item.Id));
              }}
            />
          ))}
        </div>
      ) : (
        <div className="w-full h-full overflow-y-auto pt-24 px-3 pb-safe bg-zinc-950 hide-scrollbar">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {items.map((item, index) => (
              <div key={`${item.Id}-card-${index}`} onClick={() => jumpToVideo(index)} className={`relative aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl cursor-pointer transition-all active:scale-95 ${index === activeIndex ? 'ring-2 ring-red-600 shadow-red-600/20' : 'opacity-70 hover:opacity-100'}`}>
                <img src={emby.getImageUrl(item.Id, item.ImageTags.Primary)} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black p-3"><p className="text-[10px] font-black text-white truncate uppercase tracking-tighter">{item.Name}</p></div>
                {index === activeIndex && <div className="absolute inset-0 bg-red-600/10 flex items-center justify-center"><PlayCircle className="text-white/80 w-12 h-12" /></div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoFeed;