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
import {
  setIntervalAsync,
  clearIntervalAsync,
  SetIntervalAsyncTimer,
} from "set-interval-async";

/**
 * Debounced logger to prevent excessive logging.
 * Logs immediately and then ignores subsequent calls for 2.5 seconds.
 */
const debounceLog = debounce(console.log, 2500, {
  immediate: true,
});

/**
 * The LGTVHandler class manages the connection and interactions with an LG TV.
 * It handles WebSocket communication, registration, and provides methods to control various TV functionalities.
 */
export class LGTVHandler {
  // Connection protocol (e.g., 'ws', 'wss')
  public protocol: string;
  // IP address of the LG TV
  public ip: string;
  // Port number for the WebSocket connection
  public port: number;
  // Full URI constructed from protocol, IP, and port
  public uri: string;
  // MAC address of the LG TV for Wake-on-LAN (WOL) functionality
  public macAddress: string;
  // Path to the directory where client keys are stored
  public keyPath: string;
  // WebSocket instance with reconnection capabilities
  public ws: ReconnectingWebSocket;
  // Indicates if the WebSocket is currently connected
  public isConnected: boolean;
  // Indicates if the handler is registered with the TV
  public isRegistered: boolean;
  // Interval ID for the audio checker
  private audioCheckInterval?: SetIntervalAsyncTimer<any>;

  /**
   * Initializes a new instance of the LGTVHandler class.
   * @param protocol - The WebSocket protocol ('ws' or 'wss').
   * @param ip - The IP address of the LG TV.
   * @param port - The port number for the WebSocket connection.
   * @param macAddress - The MAC address of the LG TV for WOL.
   * @param keyPath - (Optional) Custom path for storing client keys. Defaults to './keys'.
   */
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

    // Initialize the WebSocket with reconnection options
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

    // Event listener for incoming messages
    this.ws.addEventListener("message", (event) => {
      try {
        // Uncomment the line below to log parsed JSON messages
        // console.log(JSON.parse(event.data.toString()));
      } catch (error) {
        // Uncomment the line below to log raw event data on parse failure
        // console.log(event.data);
      }
    });

    // Event listener for WebSocket errors
    this.ws.addEventListener("error", (error) => {
      // Uncomment the line below to log WebSocket errors
      // console.log(error);
    });

    // Event listener for successful WebSocket connection
    // Immediately attempts to register the TV
    this.ws.addEventListener("open", async (event) => {
      this.isConnected = true;
      console.log(`LGTV ${this.uri} opened`);
      await this.register();
    });

    // Event listener for WebSocket closure
    this.ws.addEventListener("close", (event) => {
      debounceLog(`LGTV ${this.uri} lost connection`);
      this.isConnected = false;
      this.isRegistered = false;
    });
  }

  /**
   * Sends a message through the WebSocket connection.
   * @param type - The type of the message ('register', 'request', etc.).
   * @param uri - The specific endpoint URI.
   * @param payload - The payload data to send.
   * @param prefix - The prefix for the URI (default is 'ssap://').
   * @returns A promise that resolves with the server's response.
   */
  async sendMessage(
    type: string,
    uri?: string,
    payload?: any,
    prefix = `ssap://`
  ): Promise<LGWebSocketResponse> {
    return new Promise(async (resolve, reject) => {
      /**
       * If it's a request, check that the WebSocket is opened and registered
       * Reject the promise after a 5000ms timeout
       */

      if (type === "request")
        try {
          await this.waitForSocketOpen(5000);
        } catch (error) {
          return reject(error);
        }

      const id = uuidv4(); // Generate a unique ID for the message
      /**
       * Listener checks for messages containing the ID used
       * Returns the promise if found, otherwise rejects after 5000ms
       */
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
      // Set a timeout to reject the promise if no response is received in 5 seconds
      setTimeout(() => {
        this.ws.removeEventListener("message", listener);
        reject("Timeout");
      }, 1000 * 5);
    });
  }

  /**
   * Registers the handler with the LG TV.
   * Attempts to read a saved client key for authentication.
   * If no key is found, prompts the user for confirmation and saves the new key.
   */
  private async register() {
    // Ensure the key directory exists
    await mkdir(this.keyPath, {
      recursive: true,
    });
    const keys = await readdir(this.keyPath);
    const keyFile = keys.find((f) => f === this.ip);

    if (keyFile) {
      // If a key file exists for the TV, read and use it for pairing
      const key = await readFile(`${this.keyPath}/${keyFile}`, {
        encoding: "utf-8",
      });
      pairing["client-key"] = key;
    }

    // Send a registration message to the TV
    const registerMessage = await this.sendMessage(
      "register",
      undefined,
      pairing
    );

    if (registerMessage.type === "registered") {
      // Registration successful
      this.isRegistered = true;
      console.log(`LGTV ${this.uri} registered`);
    } else if (registerMessage.type === "response") {
      // Registration requires user confirmation
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

  /**
   * Sends a request to a specific endpoint with optional payload.
   * @param uri - The endpoint URI.
   * @param payload - The payload data.
   * @returns A promise with the response from the TV.
   */
  private async request(uri: string, payload?: any) {
    return this.sendMessage("request", uri, payload);
  }

  /**
   * Waits until the WebSocket is open and registered or until the timeout is reached.
   * @param timeout - Maximum time to wait in milliseconds.
   * @returns A promise that resolves when the socket is open and registered.
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

  // ===========================
  // Public API Methods
  // ===========================

  /**
   * Retrieves the list of services from the TV.
   * @returns A promise with the services information.
   */
  async getServices() {
    return this.request(Endpoint.GET_SERVICES);
  }

  /**
   * Gets the current volume level.
   * @returns A promise with the volume information.
   */
  async getVolume() {
    return this.request(Endpoint.GET_VOLUME);
  }

  /**
   * Sets the TV volume to a specified level.
   * @param volume - The desired volume level.
   * @returns A promise indicating the result of the operation.
   */
  async setVolume(volume: number) {
    return this.request(Endpoint.SET_VOLUME, {
      volume,
    });
  }

  /**
   * Retrieves information about the currently running app.
   * @returns A promise with the current app information.
   */
  async getCurrentAppInfo() {
    return this.request(Endpoint.GET_CURRENT_APP_INFO);
  }

  /**
   * Gets the current sound output settings.
   * @returns A promise with the sound output information.
   */
  async getSoundOutput() {
    return this.request(
      Endpoint.GET_SOUND_OUTPUT
    ) as Promise<SoundOutputResponse>;
  }

  /**
   * Retrieves the list of input sources.
   * @returns A promise with the available input sources.
   */
  async getInputs() {
    return this.request(Endpoint.GET_INPUTS);
  }

  /**
   * Sets the active input source.
   * @param inputId - The ID of the input source to activate.
   * @returns A promise indicating the result of the operation.
   */
  async setInput(inputId: string) {
    return this.request(Endpoint.SET_INPUT, {
      inputId,
    });
  }

  // ===========================
  // Audio Management
  // ===========================

  /**
   * Stops the audio checker interval if it's running.
   */
  stopAudioChecker() {
    if (this.audioCheckInterval) {
      clearIntervalAsync(this.audioCheckInterval);
    }
  }

  /**
   * Periodically checks and ensures the sound output matches the desired setting.
   * @param soundOutput - The desired sound output setting.
   * @returns A message if the sound output value is invalid.
   */
  async audioChecker(soundOutput: SoundOutput) {
    if (!Object.values(SoundOutput).includes(soundOutput)) {
      return `Invalid soundOutput. Valid values are: ${Object.values(
        SoundOutput
      ).join(", ")}`;
    }

    this.stopAudioChecker();

    this.audioCheckInterval = setIntervalAsync(async () => {
      try {
        if (this.isConnected && this.isRegistered) {
          const soundRequest = await this.getSoundOutput();
          if (soundRequest.payload.soundOutput !== soundOutput) {
            console.log(`setting audio output to ${soundOutput}`);
            try {
              // hit 'em with the triply whammy
              await this.setSoundOutput(soundOutput);
              await this.setSoundOutput(SoundOutput.Internal_Speaker);
              await this.setSoundOutput(soundOutput);
            } catch (error) {
              await this.setSoundOutput(soundOutput);
            }
          }
        }
      } catch (error) {
        console.log("error checking sound output");
      }
    }, 5000);
  }

  /**
   * Toggles the power state of the TV. If the TV is off, sends a Wake-on-LAN packet.
   * @returns A promise indicating the result of the operation.
   */
  async togglePower() {
    if (this.isConnected && this.isRegistered) {
      const powerState = await this.getPowerState();
      if (powerState) {
        // This toggles the power on, too; behavior depends on the TV's implementation
        return this.request(Endpoint.POWER_OFF);
      }
    } else {
      console.log(`sending WOL to ${this.ip} ${this.macAddress}`);
      return promisedWol(this.macAddress, this.ip);
    }
  }

  /**
   * Sets the sound output to the specified mode.
   * @param output - The desired sound output mode.
   * @returns A promise with the sound output response.
   */
  async setSoundOutput(output: SoundOutput) {
    return this.request(Endpoint.CHANGE_SOUND_OUTPUT, {
      output,
    }) as Promise<SoundOutputResponse>;
  }

  /**
   * Decreases the TV volume by one step.
   * @returns A promise with the volume response.
   */
  async volumeDown() {
    return this.request(Endpoint.VOLUME_DOWN) as Promise<VolumeResponse>;
  }

  /**
   * Increases the TV volume by one step.
   * @returns A promise with the volume response.
   */
  async volumeUp() {
    return this.request(Endpoint.VOLUME_UP) as Promise<VolumeResponse>;
  }

  /**
   * Toggles the mute state of the TV.
   * @returns A promise with the mute response.
   */
  async mute() {
    return this.request(Endpoint.SET_MUTE) as Promise<MuteResponse>;
  }

  /**
   * Retrieves the current audio status.
   * @returns A promise with the audio status information.
   */
  async getAudioStatus() {
    return this.request(
      Endpoint.GET_AUDIO_STATUS
    ) as Promise<AudioStatusResponse>;
  }

  /**
   * Retrieves the current power state of the TV.
   * @returns A promise with the power state information.
   */
  async getPowerState() {
    return this.request(
      Endpoint.GET_POWER_STATE
    ) as Promise<PowerStateResponse>;
  }

  // ===========================
  // Input and Text Management
  // ===========================

  /**
   * Sends an "Enter" key press to the TV.
   * @returns A promise indicating the result of the operation.
   */
  async sendEnter() {
    return this.request(Endpoint.SEND_ENTER);
  }

  /**
   * Sends a "Delete" key press to the TV.
   * @returns A promise indicating the result of the operation.
   */
  async sendDelete() {
    return this.request(Endpoint.SEND_DELETE);
  }

  /**
   * Inserts text into the currently focused input field on the TV.
   * @param text - The text to insert.
   * @returns A promise indicating the result of the operation.
   */
  async insertText(text: string) {
    return this.request(Endpoint.INSERT_TEXT, {
      text,
    });
  }

  /**
   * Turns on 3D mode on the TV.
   * @returns A promise indicating the result of the operation.
   */
  async set3DOn() {
    return this.request(Endpoint.SET_3D_ON);
  }

  /**
   * Turns off 3D mode on the TV.
   * @returns A promise indicating the result of the operation.
   */
  async set3DOff() {
    return this.request(Endpoint.SET_3D_OFF);
  }

  // ===========================
  // App Management
  // ===========================

  /**
   * Retrieves software information from the TV.
   * @returns A promise with the software information.
   */
  async getSoftwareInfo() {
    return this.request(Endpoint.GET_SOFTWARE_INFO);
  }

  /**
   * Retrieves the list of installed apps on the TV.
   * @returns A promise with the list of apps.
   */
  async getApps() {
    return this.request(Endpoint.GET_APPS) as Promise<GetAppsResponse>;
  }

  /**
   * Launches a specific app on the TV.
   * @param appId - The ID of the app to launch.
   * @returns A promise with the launch app response.
   */
  async launchApp(appId: string) {
    return this.request(Endpoint.LAUNCH_APP, {
      id: appId,
    }) as Promise<LaunchAppResponse>;
  }

  // ===========================
  // Media Control
  // ===========================

  /**
   * Plays media on the TV.
   * @returns A promise indicating the result of the operation.
   */
  async mediaPlay() {
    return this.request(Endpoint.MEDIA_PLAY);
  }

  /**
   * Stops media playback on the TV.
   * @returns A promise indicating the result of the operation.
   */
  async mediaStop() {
    return this.request(Endpoint.MEDIA_STOP);
  }

  /**
   * Pauses media playback on the TV.
   * @returns A promise indicating the result of the operation.
   */
  async mediaPause() {
    return this.request(Endpoint.MEDIA_PAUSE);
  }

  /**
   * Rewinds media playback on the TV.
   * @returns A promise indicating the result of the operation.
   */
  async mediaRewind() {
    return this.request(Endpoint.MEDIA_REWIND);
  }

  /**
   * Fast-forwards media playback on the TV.
   * @returns A promise indicating the result of the operation.
   */
  async mediaFastForward() {
    return this.request(Endpoint.MEDIA_FAST_FORWARD);
  }

  /**
   * Closes the currently playing media on the TV.
   * @returns A promise indicating the result of the operation.
   */
  async mediaClose() {
    return this.request(Endpoint.MEDIA_CLOSE);
  }

  // ===========================
  // UI Notifications
  // ===========================

  /**
   * Displays a toast notification on the TV.
   * @param message - The message to display in the toast.
   * @returns A promise indicating the result of the operation.
   */
  async showToast(message: string) {
    return this.request(Endpoint.CREATE_TOAST, {
      message,
    });
  }

  /**
   * Closes a specific toast notification on the TV.
   * @param toastId - The ID of the toast to close.
   * @returns A promise indicating the result of the operation.
   */
  async closeToast(toastId: string) {
    return this.request(Endpoint.CLOSE_TOAST, {
      toastId,
    });
  }

  /**
   * Displays an alert dialog on the TV.
   * @param message - The message to display in the alert.
   * @returns A promise indicating the result of the operation.
   */
  async showAlert(message: string) {
    return this.request(Endpoint.CREATE_ALERT, {
      message,
    });
  }

  /**
   * Closes a specific alert dialog on the TV.
   * @param alertId - The ID of the alert to close.
   * @returns A promise indicating the result of the operation.
   */
  async closeAlert(alertId: string) {
    return this.request(Endpoint.CLOSE_ALERT, {
      alertId,
    });
  }

  // ===========================
  // Launcher and System Controls
  // ===========================

  /**
   * Closes the app launcher on the TV.
   * @returns A promise indicating the result of the operation.
   */
  async closeLauncher() {
    return this.request(Endpoint.LAUNCHER_CLOSE);
  }

  /**
   * Retrieves the state of a specific app on the TV.
   * @param id - The ID of the app.
   * @returns A promise with the app state information.
   */
  async getAppState(id: string) {
    return this.request(Endpoint.GET_APP_STATE, { id });
  }

  /**
   * Retrieves system information from the TV.
   * @returns A promise with the system information.
   */
  async getSystemInfo() {
    return this.request(Endpoint.GET_SYSTEM_INFO);
  }

  /**
   * Retrieves system settings from the TV.
   * @returns A promise with the system settings.
   */
  async getSystemSettings() {
    return this.request(Endpoint.GET_SYSTEM_SETTINGS);
  }

  // ===========================
  // Channel Management
  // ===========================

  /**
   * Decreases the current TV channel by one.
   * @returns A promise indicating the result of the operation.
   */
  async channelDown() {
    return this.request(Endpoint.TV_CHANNEL_DOWN);
  }

  /**
   * Increases the current TV channel by one.
   * @returns A promise indicating the result of the operation.
   */
  async channelUp() {
    return this.request(Endpoint.TV_CHANNEL_UP);
  }

  /**
   * Retrieves the list of available TV channels.
   * @returns A promise with the list of channels.
   */
  async getChannels() {
    return this.request(Endpoint.GET_TV_CHANNELS);
  }

  /**
   * Retrieves information about a specific TV channel.
   * @param channelId - The ID of the channel.
   * @returns A promise with the channel information.
   */
  async getChannelInfo(channelId: string) {
    return this.request(Endpoint.GET_CHANNEL_INFO, { channelId });
  }

  /**
   * Retrieves the currently active TV channel.
   * @returns A promise with the current channel information.
   */
  async getCurrentChannel() {
    return this.request(Endpoint.GET_CURRENT_CHANNEL);
  }

  /**
   * Sets the TV to a specific channel.
   * @param channelId - The ID of the channel to set.
   * @returns A promise indicating the result of the operation.
   */
  async setChannel(channelId: string) {
    return this.request(Endpoint.SET_CHANNEL, { channelId });
  }

  // ===========================
  // Utility Methods
  // ===========================

  /**
   * Takes a screenshot of the current TV display.
   * @returns A promise indicating the result of the operation.
   */
  async takeScreenshot() {
    return this.request(Endpoint.TAKE_SCREENSHOT);
  }

  /**
   * Closes a web application running on the TV.
   * @returns A promise indicating the result of the operation.
   */
  async closeWebApp() {
    return this.request(Endpoint.CLOSE_WEB_APP);
  }

  /**
   * Retrieves the input socket information.
   * @returns A promise with the input socket information.
   */
  async getInputSocket() {
    return this.request(Endpoint.INPUT_SOCKET);
  }

  /**
   * Retrieves the current calibration settings.
   * @returns A promise with the calibration settings.
   */
  async getCalibration() {
    return this.request(Endpoint.GET_CALIBRATION);
  }

  /**
   * Sets new calibration settings.
   * @param calibration - The calibration data to set.
   * @returns A promise indicating the result of the operation.
   */
  async setCalibration(calibration: any) {
    return this.request(Endpoint.CALIBRATION, calibration);
  }

  /**
   * Turns off the TV screen.
   * @returns A promise indicating the result of the operation.
   */
  async turnOffScreen() {
    return this.request(Endpoint.TURN_OFF_SCREEN);
  }

  /**
   * Turns on the TV screen.
   * @returns A promise indicating the result of the operation.
   */
  async turnOnScreen() {
    return this.request(Endpoint.TURN_ON_SCREEN);
  }

  /**
   * Retrieves the current configuration settings.
   * @returns A promise with the configuration settings.
   */
  async getConfigs() {
    return this.request(Endpoint.GET_CONFIGS);
  }

  /**
   * Lists all devices connected to the TV.
   * @returns A promise with the list of devices.
   */
  async listDevices() {
    return this.request(Endpoint.LIST_DEVICES);
  }

  /**
   * Displays the input picker UI on the TV.
   * @returns A promise indicating the result of the operation.
   */
  async showInputPicker() {
    return this.request(Endpoint.LUNA_SHOW_INPUT_PICKER);
  }

  /**
   * Activates the screensaver on the TV.
   * @returns A promise indicating the result of the operation.
   */
  async activateScreensaver() {
    return this.request(Endpoint.LUNA_TURN_ON_SCREEN_SAVER);
  }

  /**
   * Reboots the TV.
   * @returns A promise indicating the result of the operation.
   */
  async reboot() {
    return this.request(Endpoint.LUNA_REBOOT_TV);
  }
}
