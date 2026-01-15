
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
      'X-Emby-Authorization': `MediaBrowser Client="EmbyTok", Device="Web", DeviceId="EmbyTok-Web", Version="3.1.0"`
    };
  }

  static async authenticate(serverUrl: string, username: string, password: string): Promise<AuthData> {
    const cleanUrl = serverUrl.replace(/\/$/, '');
    const authHeader = `MediaBrowser Client="EmbyTok", Device="Web", DeviceId="EmbyTok-Web", Version="3.1.0"`;
    
    const response = await fetch(`${cleanUrl}/Users/AuthenticateByName`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Emby-Authorization': authHeader },
      body: JSON.stringify({ Username: username, Pw: password })
    });

    if (!response.ok) throw new Error('登录失败');
    const data = await response.json();
    return {
      ServerUrl: cleanUrl,
      AccessToken: data.AccessToken,
      UserId: data.User.Id,
      Username: data.User.Name,
      IsAdmin: data.User.Policy.IsAdministrator
    };
  }

  async getLibraries(): Promise<Library[]> {
    const response = await fetch(`${this.serverUrl}/Users/${this.userId}/Views`, {
      headers: this.getHeaders(),
    });
    const data = await response.json();
    // 仅显示用户有权限访问的媒体库
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

    // 1. 媒体库过滤
    if (params.parentId) {
      query.append('ParentId', params.parentId);
    }

    // 2. 分类逻辑
    if (params.filter === 'IsFavorite') {
      // “喜欢”模式：只展示收藏内容
      query.append('Filters', 'IsFavorite');
      query.append('SortBy', 'SortName'); // 喜欢列表通常按名称或随机
    } else if (params.sortBy === 'DateCreated') {
      // “最新”模式
      query.append('SortBy', 'DateCreated');
      query.append('SortOrder', 'Descending');
    } else if (params.sortBy === 'Random') {
      // “随机”模式
      query.append('SortBy', 'Random');
    } else {
      query.append('SortBy', 'SortName');
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
