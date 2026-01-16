import { EmbyItem, AuthData, Library } from '../types';

export class EmbyService {
  private serverUrl: string;
  private accessToken: string;
  private userId: string;

  constructor(auth: AuthData) {
    this.serverUrl = auth.ServerUrl.replace(/\/$/, '');
    this.accessToken = auth.AccessToken;
    this.userId = auth.UserId;
  }

  private getHeaders() {
    return {
      'X-Emby-Token': this.accessToken,
      'Content-Type': 'application/json',
      'X-Emby-Authorization': `MediaBrowser Client=\"Web\", Device=\"EmbyTok\", DeviceId=\"EmbyTok_Web_Client\", Version=\"1.0.0\", UserId=\"${this.userId}\"`,
      'Accept': 'application/json'
    };
  }

  static async authenticate(serverUrl: string, username: string, password: string): Promise<AuthData> {
    let cleanUrl = serverUrl.trim().replace(/\/$/, '');
    if (cleanUrl && !cleanUrl.startsWith('http')) {
      cleanUrl = 'http://' + cleanUrl;
    }
    
    const authHeader = `MediaBrowser Client=\"Web\", Device=\"Browser\", DeviceId=\"EmbyTok_Web_Client\", Version=\"1.0.0\"`;
    
    try {
      const response = await fetch(`${cleanUrl}/Users/AuthenticateByName`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'X-Emby-Authorization': authHeader,
          'Accept': 'application/json'
        },
        mode: 'cors',
        body: JSON.stringify({ 
          Username: username.trim(), 
          Pw: password || "",
          Password: password || ""
        })
      });

      if (!response.ok) {
        let errorMessage = `登录失败 (状态码: ${response.status})`;
        if (response.status === 500) errorMessage = '服务器 500 错误：请检查地址或重启 Emby。';
        else if (response.status === 401) errorMessage = '用户名或密码不正确';
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      return {
        ServerUrl: cleanUrl,
        AccessToken: data.AccessToken,
        UserId: data.User.Id,
        Username: data.User.Name,
        IsAdmin: data.User.Policy?.IsAdministrator || false
      };
    } catch (err: any) {
      throw new Error(err.message || '连接服务器失败');
    }
  }

  async getLibraries(): Promise<Library[]> {
    try {
      const response = await fetch(`${this.serverUrl}/Users/${this.userId}/Views`, {
        headers: this.getHeaders(),
      });
      const data = await response.json();
      return (data.Items || [])
        .filter((item: any) => ['movies', 'tvshows', 'homevideos', 'musicvideos'].includes(item.CollectionType || '') || !item.CollectionType)
        .map((item: any) => ({ Id: item.Id, Name: item.Name }));
    } catch (e) {
      return [];
    }
  }

  async getItems(params: any = {}): Promise<EmbyItem[]> {
    const query = new URLSearchParams({
      Recursive: 'true',
      IncludeItemTypes: 'Movie,Episode,Video',
      Fields: 'UserData,RunTimeTicks,Overview,ParentId',
      Limit: (params.limit || 24).toString(),
      EnableImageTypes: 'Primary',
      ImageTypeLimit: '1'
    });
    if (params.parentId) query.append('ParentId', params.parentId);
    if (params.filter === 'IsFavorite') query.append('Filters', 'IsFavorite');
    if (params.sortBy === 'DateCreated') {
      query.append('SortBy', 'DateCreated');
      query.append('SortOrder', 'Descending');
    } else if (params.sortBy === 'Random') {
      query.append('SortBy', 'Random');
    }

    const response = await fetch(`${this.serverUrl}/Users/${this.userId}/Items?${query}`, {
      headers: this.getHeaders(),
    });
    const data = await response.json();
    return data.Items || [];
  }

  /**
   * 返回用于 <video> 播放的 URL。
   * Behavior for Emby 4.9.1.90:
   *  - 默认：返回原始静态流（Static=true），保持原行为（不转码）。
   *  - options.hls = true：请求服务器以 HLS 输出（Container=hls，Static=false）。
   *  - options.transcode = true：请求服务器转码为 mp4（Container=mp4，VideoCodec=h264，AudioCodec=aac，Static=false）。
   */
  getVideoUrl(itemId: string, options?: {
    transcode?: boolean;
    hls?: boolean;
    container?: string;
    videoCodec?: string;
    audioCodec?: string;
  }): string {
    const base = `${this.serverUrl}/Videos/${itemId}/stream`;
    const token = this.accessToken ? { api_key: this.accessToken } : {};

    if (!options || (!options.transcode && !options.hls)) {
      const params = new URLSearchParams({ Static: 'true', ...token } as Record<string, string>);
      return `${base}?${params.toString()}`;
    }

    if (options.hls) {
      const paramsObj: Record<string, string> = {
        Static: 'false',
        Container: options.container || 'hls',
        ...token
      };
      if (options.videoCodec) paramsObj['VideoCodec'] = options.videoCodec;
      if (options.audioCodec) paramsObj['AudioCodec'] = options.audioCodec;

      const params = new URLSearchParams(paramsObj);
      return `${base}?${params.toString()}`;
    }

    if (options.transcode) {
      const paramsObj: Record<string, string> = {
        Static: 'false',
        Container: options.container || 'mp4',
        VideoCodec: options.videoCodec || 'h264',
        AudioCodec: options.audioCodec || 'aac',
        ...token
      };
      const params = new URLSearchParams(paramsObj);
      return `${base}?${params.toString()}`;
    }

    const params = new URLSearchParams({ Static: 'true', ...token } as Record<string, string>);
    return `${base}?${params.toString()}`;
  }

  async deleteItem(itemId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.serverUrl}/Items/${itemId}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      return response.ok || response.status === 204;
    } catch (e) {
      console.error("Delete error:", e);
      return false;
    }
  }

  async markAsPlayed(itemId: string): Promise<void> {
    try {
      await fetch(`${this.serverUrl}/Users/${this.userId}/PlayedItems/${itemId}`, {
        method: 'POST',
        headers: this.getHeaders()
      });
    } catch (e) {
      console.warn("Failed to mark as played:", e);
    }
  }

  async setFavorite(itemId: string, isFavorite: boolean): Promise<void> {
    const method = isFavorite ? 'POST' : 'DELETE';
    await fetch(`${this.serverUrl}/Users/${this.userId}/FavoriteItems/${itemId}`, {
        method,
        headers: this.getHeaders(),
    });
  }
}