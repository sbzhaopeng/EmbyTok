
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
      'X-Emby-Authorization': `MediaBrowser Client="EmbyTok",Device="Web",DeviceId="EmbyTokWeb",Version="1.0.0"`
    };
  }

  static async authenticate(serverUrl: string, username: string, password: string): Promise<AuthData> {
    let cleanUrl = serverUrl.trim().replace(/\/$/, '');
    if (cleanUrl && !cleanUrl.startsWith('http')) {
      cleanUrl = 'http://' + cleanUrl;
    }
    
    const authHeader = `MediaBrowser Client="EmbyTok",Device="Web",DeviceId="EmbyTokWeb",Version="1.0.0"`;
    
    try {
      const response = await fetch(`${cleanUrl}/Users/AuthenticateByName`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'X-Emby-Authorization': authHeader 
        },
        body: JSON.stringify({ Username: username.trim(), Pw: password || "" })
      });

      if (!response.ok) throw new Error(`登录失败: ${response.status}`);
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
    const response = await fetch(`${this.serverUrl}/Users/${this.userId}/Views`, {
      headers: this.getHeaders(),
    });
    const data = await response.json();
    return (data.Items || [])
      .filter((item: any) => ['movies', 'tvshows', 'homevideos', 'musicvideos'].includes(item.CollectionType || '') || !item.CollectionType)
      .map((item: any) => ({ Id: item.Id, Name: item.Name }));
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

  getVideoUrl(itemId: string): string {
    return `${this.serverUrl}/Videos/${itemId}/stream.mp4?api_key=${this.accessToken}`;
  }

  getImageUrl(itemId: string, tag?: string): string {
    if (!tag) return '';
    return `${this.serverUrl}/Items/${itemId}/Images/Primary?tag=${tag}&maxWidth=400&quality=80`;
  }

  async deleteItem(itemId: string): Promise<boolean> {
    try {
      console.warn(`[EmbyService] 开始尝试物理删除项目: ${itemId}`);
      // 同时在 URL 和 Header 中携带 Token 确保万无一失
      const deleteUrl = `${this.serverUrl}/Items/${itemId}?api_key=${this.accessToken}`;
      
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'X-Emby-Token': this.accessToken,
          'X-Emby-Authorization': `MediaBrowser Client="EmbyTok",Device="Web",DeviceId="EmbyTokWeb",Version="1.0.0"`,
          'Accept': 'application/json'
        }
      });
      
      console.log(`[EmbyService] 删除响应状态: ${response.status}`);
      // Emby 删除成功通常返回 204 No Content
      return response.status === 204 || response.status === 200 || response.ok;
    } catch (e) {
      console.error('[EmbyService] 删除请求网络异常:', e);
      return false;
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
