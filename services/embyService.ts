
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
      'X-Emby-Authorization': `MediaBrowser Client="EmbyTok", Device="Web", DeviceId="EmbyTok-Web", Version="1.0.0"`
    };
  }

  static async authenticate(serverUrl: string, username: string, password: string): Promise<AuthData> {
    // 1. 清理和验证 URL
    let cleanUrl = serverUrl.trim().replace(/\/$/, '');
    if (cleanUrl && !cleanUrl.startsWith('http')) {
      cleanUrl = 'http://' + cleanUrl;
    }

    // 2. 检测 HTTPS/HTTP 混合内容风险
    if (window.location.protocol === 'https:' && cleanUrl.startsWith('http:')) {
      throw new Error('安全限制：HTTPS 页面无法连接 HTTP 服务器，请确保地址以 https:// 开头');
    }
    
    // 3. 构造标准 Auth Header
    const authHeader = `MediaBrowser Client="EmbyTok", Device="Web", DeviceId="EmbyTok-Web", Version="1.0.0"`;
    
    try {
      const response = await fetch(`${cleanUrl}/Users/AuthenticateByName`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'X-Emby-Authorization': authHeader 
        },
        body: JSON.stringify({ Username: username, Pw: password || "" })
      });

      if (!response.ok) {
        if (response.status === 401) throw new Error('账号或密码错误');
        if (response.status === 404) throw new Error('服务器地址无效 (404)');
        throw new Error(`连接失败 (${response.status})`);
      }

      const data = await response.json();
      
      if (!data.AccessToken || !data.User) {
        throw new Error('服务器返回数据格式不正确');
      }

      return {
        ServerUrl: cleanUrl,
        AccessToken: data.AccessToken,
        UserId: data.User.Id,
        Username: data.User.Name,
        IsAdmin: data.User.Policy?.IsAdministrator || false
      };
    } catch (err: any) {
      console.error('Login detailed error:', err);
      if (err.message.includes('Failed to fetch')) {
        throw new Error('网络连接失败。请检查：1.地址是否正确 2.服务器是否允许跨域(CORS) 3.是否为混合内容拦截');
      }
      throw err;
    }
  }

  async getLibraries(): Promise<Library[]> {
    const response = await fetch(`${this.serverUrl}/Users/${this.userId}/Views`, {
      headers: this.getHeaders(),
    });
    const data = await response.json();
    return (data.Items || [])
      .filter((item: any) => 
        ['movies', 'tvshows', 'homevideos', 'musicvideos'].includes(item.CollectionType || '') || 
        !item.CollectionType
      )
      .map((item: any) => ({
        Id: item.Id,
        Name: item.Name
      }));
  }

  async getItems(params: {
    sortBy?: string, 
    filter?: string, 
    parentId?: string,
    limit?: number
  } = {}): Promise<EmbyItem[]> {
    const query = new URLSearchParams({
      Recursive: 'true',
      IncludeItemTypes: 'Movie,Episode,Video',
      Fields: 'UserData,RunTimeTicks,Overview,ParentId,Taglines',
      Limit: (params.limit || 20).toString(),
      EnableImageTypes: 'Primary,Backdrop',
      ImageTypeLimit: '1'
    });

    if (params.parentId) query.append('ParentId', params.parentId);

    if (params.filter === 'IsFavorite') {
      query.append('Filters', 'IsFavorite');
      query.append('SortBy', 'SortName');
    } else if (params.sortBy === 'DateCreated') {
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
    return `${this.serverUrl}/Items/${itemId}/Images/Primary?tag=${tag}&maxWidth=600&quality=80`;
  }

  async deleteItem(itemId: string): Promise<boolean> {
    const response = await fetch(`${this.serverUrl}/Items/${itemId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return response.ok;
  }

  async setFavorite(itemId: string, isFavorite: boolean): Promise<void> {
    const method = isFavorite ? 'POST' : 'DELETE';
    await fetch(`${this.serverUrl}/Users/${this.userId}/FavoriteItems/${itemId}`, {
        method,
        headers: this.getHeaders(),
    });
  }
}
