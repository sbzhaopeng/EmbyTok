
export interface EmbyItem {
  Id: string;
  Name: string;
  Type: string;
  MediaType: string;
  ImageTags: {
    Primary?: string;
  };
  UserData: {
    PlaybackPositionTicks: number;
    PlayCount: number;
    IsFavorite: boolean;
  };
  RunTimeTicks?: number;
  Overview?: string;
  ParentBackdropItemId?: string;
  ParentBackdropImageTags?: string[];
  CollectionType?: string;
}

export interface AuthData {
  ServerUrl: string;
  AccessToken: string;
  UserId: string;
  IsAdmin: boolean;
  Username: string;
}

export interface DislikedItem {
  id: string;
  name: string;
  addedAt: number;
}

export interface Library {
  Name: string;
  Id: string;
}
