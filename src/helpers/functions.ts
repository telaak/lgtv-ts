const wol = require("node-wol");

export const promisedWol = (macAddress: string, address: string) => {
  return new Promise((resolve, reject) => {
    wol.wake(
      macAddress,
      {
        address,
        port: 9,
      },
      function (error: any) {
        if (error) {
          reject(error);
        } else {
          resolve(`WOL sent to ${address} ${macAddress}`);
        }
      }
    );
  });
};

export async function waitReject(time: number) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject();
    }, time);
  });
}

export async function waitResolve(time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, time);
  });
}

import WebSocket from "ws";

export function createWebSocketClass(options: WebSocket.ClientOptions): any {
  return class extends WebSocket {
    constructor(url: string, protocols: any) {
      super(url, protocols, options);
      this.on("error", (error) => {
        // silenced internal errors
      });
    }
  };
}
