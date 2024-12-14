export enum Endpoint {
  GET_SERVICES = "api/getServiceList",
  SET_MUTE = "audio/setMute",
  GET_AUDIO_STATUS = "audio/getStatus",
  GET_VOLUME = "audio/getVolume",
  SET_VOLUME = "audio/setVolume",
  VOLUME_UP = "audio/volumeUp",
  VOLUME_DOWN = "audio/volumeDown",
  GET_CURRENT_APP_INFO = "com.webos.applicationManager/getForegroundAppInfo",
  LAUNCH_APP = "com.webos.applicationManager/launch",
  GET_APPS = "com.webos.applicationManager/listLaunchPoints",
  GET_APPS_ALL = "com.webos.applicationManager/listApps",
  GET_APP_STATUS = "com.webos.service.appstatus/getAppStatus",
  SEND_ENTER = "com.webos.service.ime/sendEnterKey",
  SEND_DELETE = "com.webos.service.ime/deleteCharacters",
  INSERT_TEXT = "com.webos.service.ime/insertText",
  SET_3D_ON = "com.webos.service.tv.display/set3DOn",
  SET_3D_OFF = "com.webos.service.tv.display/set3DOff",
  GET_SOFTWARE_INFO = "com.webos.service.update/getCurrentSWInformation",
  MEDIA_PLAY = "media.controls/play",
  MEDIA_STOP = "media.controls/stop",
  MEDIA_PAUSE = "media.controls/pause",
  MEDIA_REWIND = "media.controls/rewind",
  MEDIA_FAST_FORWARD = "media.controls/fastForward",
  MEDIA_CLOSE = "media.viewer/close",
  POWER_OFF = "system/turnOff",
  POWER_ON = "system/turnOn",
  CREATE_TOAST = "system.notifications/createToast",
  CLOSE_TOAST = "system.notifications/closeToast",
  CREATE_ALERT = "system.notifications/createAlert",
  CLOSE_ALERT = "system.notifications/closeAlert",
  LAUNCHER_CLOSE = "system.launcher/close",
  GET_APP_STATE = "system.launcher/getAppState",
  GET_SYSTEM_INFO = "system/getSystemInfo",
  LAUNCH = "system.launcher/launch",
  OPEN = "system.launcher/open",
  GET_SYSTEM_SETTINGS = "settings/getSystemSettings",
  TV_CHANNEL_DOWN = "tv/channelDown",
  TV_CHANNEL_UP = "tv/channelUp",
  GET_TV_CHANNELS = "tv/getChannelList",
  GET_CHANNEL_INFO = "tv/getChannelProgramInfo",
  GET_CURRENT_CHANNEL = "tv/getCurrentChannel",
  GET_INPUTS = "tv/getExternalInputList",
  SET_CHANNEL = "tv/openChannel",
  SET_INPUT = "tv/switchInput",
  TAKE_SCREENSHOT = "tv/executeOneShot",
  CLOSE_WEB_APP = "webapp/closeWebApp",
  INPUT_SOCKET = "com.webos.service.networkinput/getPointerInputSocket",
  CALIBRATION = "externalpq/setExternalPqData",
  GET_CALIBRATION = "externalpq/getExternalPqData",
  GET_SOUND_OUTPUT = "com.webos.service.apiadapter/audio/getSoundOutput",
  CHANGE_SOUND_OUTPUT = "com.webos.service.apiadapter/audio/changeSoundOutput",
  GET_POWER_STATE = "com.webos.service.tvpower/power/getPowerState",
  TURN_OFF_SCREEN = "com.webos.service.tvpower/power/turnOffScreen",
  TURN_ON_SCREEN = "com.webos.service.tvpower/power/turnOnScreen",
  TURN_OFF_SCREEN_WO4 = "com.webos.service.tv.power/turnOffScreen",
  TURN_ON_SCREEN_WO4 = "com.webos.service.tv.power/turnOnScreen",
  GET_CONFIGS = "config/getConfigs",
  LIST_DEVICES = "com.webos.service.attachedstoragemanager/listDevices",

  LUNA_SET_CONFIGS = "com.webos.service.config/setConfigs",
  LUNA_SET_SYSTEM_SETTINGS = "com.webos.settingsservice/setSystemSettings",
  LUNA_TURN_ON_SCREEN_SAVER = "com.webos.service.tvpower/power/turnOnScreenSaver",
  LUNA_REBOOT_TV = "com.webos.service.tvpower/power/reboot",
  LUNA_REBOOT_TV_WO4 = "com.webos.service.tv.power/reboot",
  LUNA_SHOW_INPUT_PICKER = "com.webos.surfacemanager/showInputPicker",
  LUNA_SET_DEVICE_INFO = "com.webos.service.eim/setDeviceInfo",
  LUNA_EJECT_DEVICE = "com.webos.service.attachedstoragemanager/ejectDevice",
  LUNA_SET_TPC = "com.webos.service.oledepl/setTemporalPeakControl",
  LUNA_SET_GSR = "com.webos.service.oledepl/setGlobalStressReduction",
  LUNA_SET_WHITE_BALANCE = "com.webos.service.pqcontroller/setWhiteBalance",
}

export enum SoundOutput {
  Internal_Speaker = "tv_speaker",
  Optical_Audio = "external_optical",
  HDMI_ARC = "external_arc",
  Line_Out = "lineout",
  Headphones = "headphone",
  External_Speaker = "external_speaker",
  TV_And_Optical = "tv_external_speaker",
  TV_And_Headphones = "tv_speaker_headphone",
  Bluetooth_Soundbar = "bt_soundbar",
  Soundbar = "soundbar",
}
