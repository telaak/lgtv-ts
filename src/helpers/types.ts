import { SoundOutput } from "./enums";

export interface LGWebSocketResponse {
  type: "response" | "registered";
  id: string;
  payload?: any;
}

export interface PowerStateResponse
  extends Omit<LGWebSocketResponse, "payload"> {
  payload: {
    returnValue: boolean;
    state: string;
  };
}

export interface SoundOutputResponse
  extends Omit<LGWebSocketResponse, "payload"> {
  payload: {
    returnValue: boolean;
    soundOutput: SoundOutput;
  };
}

export interface VolumeResponse extends Omit<LGWebSocketResponse, "payload"> {
  payload: {
    volume: number;
    returnValue: boolean;
    soundOutput: SoundOutput;
  };
}

export interface MuteResponse extends Omit<LGWebSocketResponse, "payload"> {
  payload: {
    returnValue: boolean;
    muteStatus: boolean;
    soundOutput: SoundOutput;
  };
}

export interface AudioStatusResponse
  extends Omit<LGWebSocketResponse, "payload"> {
  payload: {
    returnValue: boolean;
    volumeStatus: {
      activeStatus: boolean;
      adjustVolume: boolean;
      maxVolume: number;
      muteStatus: boolean;
      volume: number;
      mode: string;
      soundOutput: SoundOutput;
    };
    callerId: string;
    mute: boolean;
    volume: number;
  };
}

export interface GetAppsResponse extends Omit<LGWebSocketResponse, "payload"> {
  subscribed: boolean;
  caseDetail: any[];
  launchPoints: LaunchPoint[];
  returnValue: boolean;
}

export interface LaunchPoint {
  systemApp: boolean;
  removable: boolean;
  relaunch: boolean;
  mediumLargeIcon: string;
  bgImages: any[];
  userData: string;
  id: string;
  largeIcon: string;
  bgColor: string;
  title: string;
  iconColor: string;
  appDescription: string;
  lptype: string;
  params: any;
  bgImage: string;
  unmovable: boolean;
  miniicon: string;
  icon: string;
  launchPointId: string;
  favicon: string;
  installTime: number;
  imageForRecents: string;
  tileSize: string;
  previewMetadata?: {
    sourceEndpoint: string;
    targetEndpoint: string;
  };
}

export interface LaunchAppResponse
  extends Omit<LGWebSocketResponse, "payload"> {
  payload: {
    returnValue: boolean;
    errorCode?: number;
    errorText?: string;
  };
}
