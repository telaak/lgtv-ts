import { WebSocket as ReconnectingWebSocket } from "partysocket";
import { Endpoint } from "./helpers/enums";
import {
  createWebSocketClass,
  promisedWol,
  waitResolve,
} from "./helpers/functions";
import { v4 as uuidv4 } from "uuid";
import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import {
  AudioStatusResponse,
  GetAppsResponse,
  LaunchAppResponse,
  LGWebSocketResponse,
  MuteResponse,
  PowerStateResponse,
  SoundOutputResponse,
  VolumeResponse,
} from "./helpers/types";
import { SoundOutput } from "./helpers/enums";
import debounce from "debounce";
import { pairing } from "./pairing";
import { cwd } from "process";
const debounceLog = debounce(console.log, 2500, {
  immediate: true,
});

export class LGTVHandler {
  public protocol: string;
  public ip: string;
  public port: number;
  public uri: string;
  public macAddress: string;
  public ws: ReconnectingWebSocket;
  public isConnected: boolean;
  public isRegistered: boolean;
  public keyPath: string;

  constructor(
    protocol: string,
    ip: string,
    port: number,
    macAddress: string,
    keyPath?: string
  ) {
    this.protocol = protocol;
    this.ip = ip;
    this.port = port;
    this.uri = `${protocol}://${ip}:${port}`;
    this.macAddress = macAddress;
    this.keyPath = keyPath || `${cwd()}/keys`;
    this.ws = new ReconnectingWebSocket(this.uri, undefined, {
      WebSocket: createWebSocketClass({
        rejectUnauthorized: false,
      }),
      connectionTimeout: 1000,
      minReconnectionDelay: 1000,
      maxReconnectionDelay: 1000,
    });
    this.isConnected = false;
    this.isRegistered = false;

    this.ws.addEventListener("message", (event) => {
      try {
        //  console.log(JSON.parse(event.data.toString()));
      } catch (error) {
        //  console.log(event.data);
      }
    });

    this.ws.addEventListener("error", (error) => {
      // console.log(error);
    });

    this.ws.addEventListener("open", async (event) => {
      this.isConnected = true;
      console.log(`LGTV ${this.uri} opened`);
      await this.register();
    });

    this.ws.addEventListener("close", (event) => {
      debounceLog(`LGTV ${this.uri} lost connection`);
      this.isConnected = false;
      this.isRegistered = false;
    });
  }

  async sendMessage(
    type: string,
    uri?: string,
    payload?: any,
    prefix = `ssap://`
  ): Promise<LGWebSocketResponse> {
    return new Promise(async (resolve, reject) => {
      if (type === "request")
        try {
          await this.waitForSocketOpen(5000);
        } catch (error) {
          return reject(error);
        }

      const id = uuidv4();
      const listener = (event: MessageEvent) => {
        try {
          const json = JSON.parse(event.data.toString());
          if (json.id && json.id === id) {
            this.ws.removeEventListener("message", listener);
            resolve(json);
          }
        } catch (error) {
          reject(error);
        }
      };
      this.ws.addEventListener("message", listener);
      this.ws.send(
        JSON.stringify({
          id,
          type,
          uri: `${prefix}${uri}`,
          payload,
        })
      );
      setTimeout(() => {
        this.ws.removeEventListener("message", listener);
        reject("Timeout");
      }, 1000 * 5);
    });
  }

  private async register() {
    await mkdir(this.keyPath, {
      recursive: true,
    });
    const keys = await readdir(this.keyPath);
    const keyFile = keys.find((f) => f === this.ip);

    if (keyFile) {
      const key = await readFile(`${this.keyPath}/${keyFile}`, {
        encoding: "utf-8",
      });
      pairing["client-key"] = key;
    }

    const registerMessage = await this.sendMessage(
      "register",
      undefined,
      pairing
    );

    if (registerMessage.type === "registered") {
      this.isRegistered = true;
      console.log(`LGTV ${this.uri} registered`);
    } else if (registerMessage.type === "response") {
      console.log(`LGTV ${this.uri} prompting for confirmation`);
      const listener = async (event: MessageEvent) => {
        const json = JSON.parse(event.data.toString());
        if (json.type === "registered") {
          const clientKey = json.payload["client-key"];
          pairing["client-key"] = clientKey;
          await writeFile(`./keys/${this.ip}`, clientKey, {
            encoding: "utf-8",
          });
          console.log(`LGTV key written to ./keys/${this.ip}`);
          this.isRegistered = true;
          this.ws.removeEventListener("message", listener);
        }
      };
      this.ws.addEventListener("message", listener);
    }
  }

  private async request(uri: string, payload?: any) {
    return this.sendMessage("request", uri, payload);
  }

  /**
   * Waits until `this.isOpen` is true, or rejects if the timeout is reached.
   *
   * @param timeout - The maximum time to wait in milliseconds.
   * @returns A promise that resolves when `this.isOpen` is true, or rejects if the timeout is exceeded.
   */
  private async waitForSocketOpen(timeout: number): Promise<void> {
    const interval = 1; // Check every 1ms
    let elapsed = 0;

    return new Promise((resolve, reject) => {
      const check = () => {
        if (this.isConnected && this.isRegistered) {
          resolve();
        } else if (elapsed >= timeout) {
          reject(`Socket did not open within ${timeout}ms`);
        } else {
          elapsed += interval;
          setTimeout(check, interval);
        }
      };

      check();
    });
  }

  async getServices() {
    return this.request(Endpoint.GET_SERVICES);
  }

  async getVolume() {
    return this.request(Endpoint.GET_VOLUME);
  }

  async setVolume(volume: number) {
    return this.request(Endpoint.SET_VOLUME, {
      volume,
    });
  }

  async getCurrentAppInfo() {
    return this.request(Endpoint.GET_CURRENT_APP_INFO);
  }

  async getSoundOutput() {
    return this.request(
      Endpoint.GET_SOUND_OUTPUT
    ) as Promise<SoundOutputResponse>;
  }

  async getInputs() {
    return this.request(Endpoint.GET_INPUTS);
  }

  async setInput(inputId: string) {
    return this.request(Endpoint.SET_INPUT, {
      inputId,
    });
  }

  public audioCheckInterval?: ReturnType<typeof setInterval>;

  stopAudioChecker() {
    if (this.audioCheckInterval) {
      clearInterval(this.audioCheckInterval);
    }
  }

  async audioChecker(soundOutput: SoundOutput) {
    if (!Object.values(SoundOutput).includes(soundOutput)) {
      return `Invalid soundOutput. Valid values are: ${Object.values(
        SoundOutput
      ).join(", ")}`;
    }

    this.stopAudioChecker();

    this.audioCheckInterval = setInterval(async () => {
      try {
        if (this.isConnected && this.isRegistered) {
          const soundRequest = await this.getSoundOutput();
          if (soundRequest.payload.soundOutput !== soundOutput) {
            console.log(`setting audio output to ${soundOutput}`);
            await this.setSoundOutput(soundOutput);
          }
        }
      } catch (error) {
        console.log("error checking sound output");
      }
    }, 1000);
  }

  async togglePower() {
    if (this.isConnected && this.isRegistered) {
      const powerState = await this.getPowerState();
      if (powerState) {
        // for some reason this also toggles power on
        return this.request(Endpoint.POWER_OFF);
      }
    } else {
      console.log(`sending WOL to ${this.macAddress}`);
      return promisedWol(this.macAddress);
    }
  }

  async setSoundOutput(output: SoundOutput) {
    return this.request(Endpoint.CHANGE_SOUND_OUTPUT, {
      output,
    }) as Promise<SoundOutputResponse>;
  }

  async volumeDown() {
    return this.request(Endpoint.VOLUME_DOWN) as Promise<VolumeResponse>;
  }

  async volumeUp() {
    return this.request(Endpoint.VOLUME_UP) as Promise<VolumeResponse>;
  }

  async mute() {
    return this.request(Endpoint.SET_MUTE) as Promise<MuteResponse>;
  }

  async getAudioStatus() {
    return this.request(
      Endpoint.GET_AUDIO_STATUS
    ) as Promise<AudioStatusResponse>;
  }

  async getPowerState() {
    return this.request(
      Endpoint.GET_POWER_STATE
    ) as Promise<PowerStateResponse>;
  }

  async sendEnter() {
    return this.request(Endpoint.SEND_ENTER);
  }

  async sendDelete() {
    return this.request(Endpoint.SEND_DELETE);
  }

  async insertText(text: string) {
    return this.request(Endpoint.INSERT_TEXT, {
      text,
    });
  }

  async set3DOn() {
    return this.request(Endpoint.SET_3D_ON);
  }

  async set3DOff() {
    return this.request(Endpoint.SET_3D_OFF);
  }

  async getSoftwareInfo() {
    return this.request(Endpoint.GET_SOFTWARE_INFO);
  }

  async getApps() {
    return this.request(Endpoint.GET_APPS) as Promise<GetAppsResponse>;
  }

  async launchApp(appId: string) {
    return this.request(Endpoint.LAUNCH_APP, {
      id: appId,
    }) as Promise<LaunchAppResponse>;
  }

  async mediaPlay() {
    return this.request(Endpoint.MEDIA_PLAY);
  }

  async mediaStop() {
    return this.request(Endpoint.MEDIA_STOP);
  }

  async mediaPause() {
    return this.request(Endpoint.MEDIA_PAUSE);
  }

  async mediaRewind() {
    return this.request(Endpoint.MEDIA_REWIND);
  }

  async mediaFastForward() {
    return this.request(Endpoint.MEDIA_FAST_FORWARD);
  }

  async mediaClose() {
    return this.request(Endpoint.MEDIA_CLOSE);
  }

  async showToast(message: string) {
    return this.request(Endpoint.CREATE_TOAST, {
      message,
    });
  }

  async closeToast(toastId: string) {
    return this.request(Endpoint.CLOSE_TOAST, {
      toastId,
    });
  }

  async showAlert(message: string) {
    return this.request(Endpoint.CREATE_ALERT, {
      message,
    });
  }

  async closeAlert(alertId: string) {
    return this.request(Endpoint.CLOSE_ALERT, {
      alertId,
    });
  }

  async closeLauncher() {
    return this.request(Endpoint.LAUNCHER_CLOSE);
  }

  async getAppState(id: string) {
    return this.request(Endpoint.GET_APP_STATE, { id });
  }

  async getSystemInfo() {
    return this.request(Endpoint.GET_SYSTEM_INFO);
  }

  async getSystemSettings() {
    return this.request(Endpoint.GET_SYSTEM_SETTINGS);
  }

  async channelDown() {
    return this.request(Endpoint.TV_CHANNEL_DOWN);
  }

  async channelUp() {
    return this.request(Endpoint.TV_CHANNEL_UP);
  }

  async getChannels() {
    return this.request(Endpoint.GET_TV_CHANNELS);
  }

  async getChannelInfo(channelId: string) {
    return this.request(Endpoint.GET_CHANNEL_INFO, { channelId });
  }

  async getCurrentChannel() {
    return this.request(Endpoint.GET_CURRENT_CHANNEL);
  }

  async setChannel(channelId: string) {
    return this.request(Endpoint.SET_CHANNEL, { channelId });
  }

  async takeScreenshot() {
    return this.request(Endpoint.TAKE_SCREENSHOT);
  }

  async closeWebApp() {
    return this.request(Endpoint.CLOSE_WEB_APP);
  }

  async getInputSocket() {
    return this.request(Endpoint.INPUT_SOCKET);
  }

  async getCalibration() {
    return this.request(Endpoint.GET_CALIBRATION);
  }

  async setCalibration(calibration: any) {
    return this.request(Endpoint.CALIBRATION, calibration);
  }

  async turnOffScreen() {
    return this.request(Endpoint.TURN_OFF_SCREEN);
  }

  async turnOnScreen() {
    return this.request(Endpoint.TURN_ON_SCREEN);
  }

  async getConfigs() {
    return this.request(Endpoint.GET_CONFIGS);
  }

  async listDevices() {
    return this.request(Endpoint.LIST_DEVICES);
  }

  async showInputPicker() {
    return this.request(Endpoint.LUNA_SHOW_INPUT_PICKER);
  }

  async activateScreensaver() {
    return this.request(Endpoint.LUNA_TURN_ON_SCREEN_SAVER);
  }

  async reboot() {
    return this.request(Endpoint.LUNA_REBOOT_TV);
  }
}
