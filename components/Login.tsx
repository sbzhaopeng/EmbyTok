
import React, { useState } from 'react';
import { AuthData } from '../types';
import { EmbyService } from '../services/embyService';

interface LoginProps {
  onLogin: (auth: AuthData) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const authData = await EmbyService.authenticate(serverUrl, username, password);
      onLogin(authData);
    } catch (err: any) {
      setError(err.message || '登录失败，请检查设置');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh p-6 bg-zinc-950 text-white">
      <div className="w-full max-w-md bg-zinc-900 p-8 rounded-3xl shadow-2xl space-y-8 border border-white/5">
        <div className="text-center">
          <h1 className="text-4xl font-black bg-gradient-to-br from-white to-zinc-500 bg-clip-text text-transparent tracking-tighter">EmbyTok Pro</h1>
          <p className="text-zinc-500 mt-2 font-medium">连接您的媒体库</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 ml-1">服务器地址</label>
            <input 
              type="text" 
              placeholder="例如: 192.168.1.100:8096"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              className="w-full px-5 py-4 bg-zinc-800 rounded-2xl focus:ring-2 focus:ring-white/20 outline-none transition-all border border-white/5 text-sm"
              required
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 ml-1">用户名</label>
            <input 
              type="text" 
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-5 py-4 bg-zinc-800 rounded-2xl focus:ring-2 focus:ring-white/20 outline-none transition-all border border-white/5 text-sm"
              required
              autoCapitalize="none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 ml-1">密码</label>
            <input 
              type="password" 
              placeholder="Password (选填)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-4 bg-zinc-800 rounded-2xl focus:ring-2 focus:ring-white/20 outline-none transition-all border border-white/5 text-sm"
            />
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
              <p className="text-red-500 text-xs text-center font-bold">{error}</p>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-5 bg-white text-black rounded-2xl font-black text-lg active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? '正在验证...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
