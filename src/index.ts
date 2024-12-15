import "dotenv/config";

import Fastify, { FastifyRequest } from "fastify";
import fastifySwagger, {
  type FastifyDynamicSwaggerOptions,
} from "@fastify/swagger";
import fastifySwaggerUi, {
  type FastifySwaggerUiOptions,
} from "@fastify/swagger-ui";
import { LGTVHandler } from "lgtv-ts";
import { SoundOutput } from "lgtv-ts/dist/helpers/enums";

const swaggerOptions: FastifyDynamicSwaggerOptions = {
  mode: "dynamic",
  openapi: {
    openapi: "3.0.0",
    info: {
      title: "lgtv-ts-fastify",
      description: "API documentation for lgtv-ts-fastify",
      version: "1.0.0",
    },
    servers: [
      {
        url: process.env.SERVER_URL || `http://localhost:3000`,
        description: process.env.SERVER_URL
          ? "Environment variable"
          : "Development server",
      },
    ],
  },
};

const swaggerUiOptions: FastifySwaggerUiOptions = {
  routePrefix: "/docs",
  uiConfig: {
    docExpansion: "full",
    deepLinking: true,
  },
};

export const tvHandler = new LGTVHandler(
  process.env.TV_PROTOCOL as string,
  process.env.TV_IP as string,
  Number(process.env.TV_PORT as string),
  process.env.TV_MAC as string,
  process.env.KEY_PATH as string
);

if (process.env.AUDIO_CHECKER) {
  tvHandler.audioChecker(process.env.AUDIO_CHECKER as SoundOutput);
}

export const fastify = Fastify({
  logger: false,
});

fastify.register(fastifySwagger, swaggerOptions);
fastify.register(fastifySwaggerUi, swaggerUiOptions);

async function start() {
  await fastify.ready();
  fastify.swagger();
  fastify.listen({ port: 3000, host: "0.0.0.0" }, function (err, address) {
    if (err) {
      fastify.log.error(err);
      process.exit(1);
    }
  });
}

start();

// Route to get app state

fastify.register((app, options, done) => {
  // Method 1: sendMessage
  app.post(
    "/send-message",
    {
      schema: {
        description: "Send a message to the TV.",
        body: {
          type: "object",
          properties: {
            type: {
              type: "string",
              description: "The type of message to send.",
            },
            uri: { type: "string", description: "The URI of the message." },
            payload: {
              type: "object",
              description: "The payload of the message.",
            },
            prefix: {
              type: "string",
              description: "Optional prefix for the message.",
            },
          },
          required: ["type"],
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: { type: string; uri: string; payload: any; prefix?: string };
      }>,
      reply
    ) => {
      const { type, uri, payload, prefix = "ssap://" } = request.body;
      try {
        const response = await tvHandler.sendMessage(
          type,
          uri,
          payload,
          prefix
        );
        return reply.send(response);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 2: getServices
  app.get(
    "/services",
    {
      schema: {
        description: "Get a list of available services on the TV.",
        response: {
          200: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const services = await tvHandler.getServices();
        return reply.send(services);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 3: getVolume
  app.get(
    "/volume",
    {
      schema: {
        description: "Get the current volume of the TV.",
        response: {
          200: {
            type: "object",
            properties: {
              volume: { type: "number", description: "Current volume level." },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const volume = await tvHandler.getVolume();
        return reply.send(volume);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 4: setVolume
  app.post(
    "/set-volume",
    {
      schema: {
        description: "Set the volume of the TV.",
        body: {
          type: "object",
          properties: {
            volume: { type: "number", description: "Desired volume level." },
          },
          required: ["volume"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: { volume: number } }>, reply) => {
      const { volume } = request.body;
      try {
        const response = await tvHandler.setVolume(volume);
        return reply.send(response);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 5: getCurrentAppInfo
  app.get(
    "/current-app-info",
    {
      schema: {
        description: "Get information about the current active app on the TV.",
        response: {
          200: {
            type: "object",
            properties: {
              appId: { type: "string" },
              returnValue: { type: "boolean" },
              windowId: { type: "string" },
              processId: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const appInfo = await tvHandler.getCurrentAppInfo();
        return reply.send(appInfo.payload);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 6: getSoundOutput
  app.get(
    "/sound-output",
    {
      schema: {
        description: "Get the current sound output device on the TV.",
        response: {
          200: {
            type: "object",
            properties: {
              soundOutput: {
                description:
                  "Current sound output device (e.g., external_arc, internal_speakers).",
                type: "string",
              },
              returnValue: {
                type: "boolean",
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const soundOutput = await tvHandler.getSoundOutput();
        return reply.send(soundOutput.payload);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 7: getInputs
  app.get(
    "/inputs",
    {
      schema: {
        description: "Get the list of available input sources on the TV.",
        response: {
          200: {
            type: "object",
            properties: {
              returnValue: {
                type: "boolean",
              },
              devices: {
                type: "array",
                items: {
                  id: {
                    type: "string",
                  },
                  label: {
                    type: "string",
                  },
                  port: {
                    type: "number",
                  },
                  connected: {
                    type: "boolean",
                  },
                  appId: {
                    type: "string",
                  },
                  icon: {
                    type: "string",
                  },
                  forceIcon: {
                    type: "boolean",
                  },
                  modified: {
                    type: "boolean",
                  },
                  lastUniqueId: {
                    type: "number",
                  },
                  hdmiPlugIn: {
                    type: "boolean",
                  },
                  subcount: {
                    type: "number",
                  },
                  favorite: {
                    type: "boolean",
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const inputs = await tvHandler.getInputs();
        return reply.send(inputs.payload);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 8: setInput
  app.post(
    "/set-input",
    {
      schema: {
        description: "Set the current input source on the TV.",
        body: {
          type: "object",
          properties: {
            inputId: {
              type: "string",
              description: "The ID of the input source to switch to.",
            },
          },
          required: ["inputId"],
        },
      },
    },
    async (request: FastifyRequest<{ Body: { inputId: string } }>, reply) => {
      const { inputId } = request.body;
      try {
        const response = await tvHandler.setInput(inputId);
        return reply.send(response);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 9: stopAudioChecker
  app.post(
    "/stop-audio-checker",
    {
      schema: {
        description: "Stop the audio checker on the TV.",
      },
    },
    async (request, reply) => {
      try {
        const response = tvHandler.stopAudioChecker();
        return reply.send("OK");
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 10: audioChecker
  app.post(
    "/audio-checker",
    {
      schema: {
        description: "Start the audio checker on the TV.",
        body: {
          type: "object",
          properties: {
            output: {
              type: "string",
              description:
                "The sound output device to check (e.g., HDMI, ARC).",
            },
          },
          required: ["output"],
        },
      },
    },
    async (request: FastifyRequest<{ Body: { output: string } }>, reply) => {
      const { output } = request.body;
      try {
        const response = await tvHandler.audioChecker(output as SoundOutput);
        return reply.send("OK");
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 11: togglePower
  app.post(
    "/toggle-power",
    {
      schema: {
        description: "Toggle the power state of the TV.",
      },
    },
    async (request, reply) => {
      try {
        const response = await tvHandler.togglePower();
        return reply.send(response);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 12: setSoundOutput
  app.post(
    "/set-sound-output",
    {
      schema: {
        description: "Set the sound output device on the TV.",
        body: {
          type: "object",
          properties: {
            output: {
              type: "string",
              description: "The sound output device (e.g., HDMI, ARC).",
            },
          },
          required: ["output"],
        },
      },
    },
    async (request: FastifyRequest<{ Body: { output: string } }>, reply) => {
      const { output } = request.body;
      try {
        const response = await tvHandler.setSoundOutput(output as SoundOutput);
        return reply.send(response);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 13: volumeDown
  app.post(
    "/volume-down",
    {
      schema: {
        description: "Decrease the volume of the TV.",
        response: {
          200: {
            type: "object",
            properties: {
              returnValue: { type: "boolean" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const response = await tvHandler.volumeDown();
        return reply.send(response.payload);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 14: volumeUp
  app.post(
    "/volume-up",
    {
      schema: {
        description: "Increase the volume of the TV.",
        response: {
          200: {
            type: "object",
            properties: {
              returnValue: { type: "boolean" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const response = await tvHandler.volumeUp();
        return reply.send(response.payload);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 15: mute
  app.post(
    "/mute",
    {
      schema: {
        description: "Mute or unmute the TV.",
        response: {
          200: {
            type: "object",
            properties: {
              returnValue: { type: "boolean" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const response = await tvHandler.mute();
        return reply.send(response.payload);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 16: getAudioStatus
  app.get(
    "/audio-status",
    {
      schema: {
        description: "Get the current audio status of the TV.",
        response: {
          200: {
            type: "object",
            properties: {
              returnValue: { type: "boolean" },
              callerId: { type: "string" },
              mute: { type: "boolean" },
              volume: { type: "number" },
              volumeStatus: {
                type: "object",
                properties: {
                  activeStatus: { type: "boolean" },
                  adjustVolume: { type: "boolean" },
                  maxVolume: { type: "number" },
                  muteStatus: { type: "boolean" },
                  volume: { type: "number" },
                  mode: { type: "string" },
                  soundOutput: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const audioStatus = await tvHandler.getAudioStatus();
        return reply.send(audioStatus.payload);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 17: getPowerState
  app.get(
    "/power-state",
    {
      schema: {
        description: "Get the current power state of the TV.",
        response: {
          200: {
            type: "object",
            properties: {
              state: { type: "string" },
              returnValue: { type: "boolean" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const powerState = await tvHandler.getPowerState();
        return reply.send(powerState.payload);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 18: sendEnter
  app.post(
    "/send-enter",
    {
      schema: {
        description: "Simulate pressing the enter key on the TV.",
        response: {
          200: {
            type: "object",
            properties: {
              returnValue: { type: "boolean" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const response = await tvHandler.sendEnter();
        return reply.send(response.payload);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 19: sendDelete
  app.post(
    "/send-delete",
    {
      schema: {
        description: "Simulate pressing the delete key on the TV.",
        response: {
          200: {
            type: "object",
            properties: {
              returnValue: { type: "boolean" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const response = await tvHandler.sendDelete();
        return reply.send(response.payload);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 20: insertText
  app.post(
    "/insert-text",
    {
      schema: {
        description: "Insert a text input to the TV.",
        body: {
          type: "object",
          properties: {
            text: { type: "string", description: "The text to insert." },
          },
          required: ["text"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              returnValue: { type: "boolean" },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: { text: string } }>, reply) => {
      const { text } = request.body;
      try {
        const response = await tvHandler.insertText(text);
        return reply.send(response.payload);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 21: set3DOn
  app.post(
    "/set-3d-on",
    {
      schema: {
        description: "Enable 3D mode on the TV.",
        response: {
          200: {
            type: "object",
            properties: {
              returnValue: { type: "boolean" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const response = await tvHandler.set3DOn();
        return reply.send(response.payload);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 22: set3DOff
  app.post(
    "/set-3d-off",
    {
      schema: {
        description: "Disable 3D mode on the TV.",
        response: {
          200: {
            type: "object",
            properties: {
              returnValue: { type: "boolean" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const response = await tvHandler.set3DOff();
        return reply.send(response.payload);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 23: getSoftwareInfo
  app.get(
    "/software-info",
    {
      schema: {
        description: "Get the software version and details of the TV.",
        // TODO: response
      },
    },
    async (request, reply) => {
      try {
        const softwareInfo = await tvHandler.getSoftwareInfo();
        return reply.send(softwareInfo);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 24: getApps
  app.get(
    "/apps",
    {
      schema: {
        description: "Get a list of apps installed on the TV.",
        // TODO: response
      },
    },
    async (request, reply) => {
      try {
        const apps = await tvHandler.getApps();
        return reply.send(apps);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 25: launchApp
  app.post(
    "/launch-app",
    {
      schema: {
        description: "Launch a specific app on the TV.",
        body: {
          type: "object",
          properties: {
            appId: {
              type: "string",
              description: "The ID of the app to launch.",
            },
          },
          required: ["appId"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              returnValue: { type: "boolean" },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: { appId: string } }>, reply) => {
      const { appId } = request.body;
      try {
        const response = await tvHandler.launchApp(appId);
        return reply.send(response.payload);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 26: mediaPlay
  app.post(
    "/media-play",
    {
      schema: {
        description: "Play media content on the TV.",
        response: {
          200: {
            type: "object",
            properties: {
              returnValue: { type: "boolean" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const response = await tvHandler.mediaPlay();
        return reply.send(response.payload);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 27: mediaStop
  app.post(
    "/media-stop",
    {
      schema: {
        description: "Stop the currently playing media on the TV.",
        response: {
          200: {
            type: "object",
            properties: {
              returnValue: { type: "boolean" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const response = await tvHandler.mediaStop();
        return reply.send(response.payload);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 28: mediaPause
  app.post(
    "/media-pause",
    {
      schema: {
        description: "Pause the currently playing media on the TV.",
        response: {
          200: {
            type: "object",
            properties: {
              returnValue: { type: "boolean" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const response = await tvHandler.mediaPause();
        return reply.send(response.payload);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 29: mediaRewind
  app.post(
    "/media-rewind",
    {
      schema: {
        description: "Rewind the currently playing media on the TV.",
        response: {
          200: {
            type: "object",
            properties: {
              returnValue: { type: "boolean" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const response = await tvHandler.mediaRewind();
        return reply.send(response.payload);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 30: mediaFastForward
  app.post(
    "/media-fast-forward",
    {
      schema: {
        description: "Fast forward the currently playing media on the TV.",
        response: {
          200: {
            type: "object",
            properties: {
              returnValue: { type: "boolean" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const response = await tvHandler.mediaFastForward();
        return reply.send(response.payload);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 31: mediaClose
  app.post(
    "/media-close",
    {
      schema: {
        description: "Close the currently playing media on the TV.",
        response: {
          200: {
            type: "object",
            properties: {
              returnValue: { type: "boolean" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const response = await tvHandler.mediaClose();
        return reply.send(response.payload);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 32: showToast
  app.post(
    "/show-toast",
    {
      schema: {
        description: "Show a toast notification on the TV.",
        body: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "The message to display in the toast.",
            },
          },
          required: ["message"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              returnValue: { type: "boolean" },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: { message: string } }>, reply) => {
      const { message } = request.body;
      try {
        const response = await tvHandler.showToast(message);
        return reply.send(response.payload);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 33: closeToast
  app.post(
    "/close-toast",
    {
      schema: {
        description: "Close a toast notification on the TV.",
        body: {
          type: "object",
          properties: {
            toastId: {
              type: "string",
              description: "The ID of the toast notification to close.",
            },
          },
          required: ["toastId"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              returnValue: { type: "boolean" },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: { toastId: string } }>, reply) => {
      const { toastId } = request.body;
      try {
        const response = await tvHandler.closeToast(toastId);
        return reply.send(response.payload);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 34: showAlert
  app.post(
    "/show-alert",
    {
      schema: {
        description: "Show an alert message on the TV.",
        body: {
          type: "object",
          properties: {
            message: { type: "string", description: "The alert message." },
          },
          required: ["message"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              returnValue: { type: "boolean" },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: { message: string } }>, reply) => {
      const { message } = request.body;
      try {
        const response = await tvHandler.showAlert(message);
        return reply.send(response.payload);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 35: closeAlert
  app.post(
    "/close-alert",
    {
      schema: {
        description: "Close an active alert on the TV.",
        body: {
          type: "object",
          properties: {
            alertId: {
              type: "string",
              description: "The ID of the alert to close.",
            },
          },
          required: ["alertId"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              returnValue: { type: "boolean" },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: { alertId: string } }>, reply) => {
      const { alertId } = request.body;
      try {
        const response = await tvHandler.closeAlert(alertId);
        return reply.send(response.payload);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 36: closeLauncher
  app.post(
    "/close-launcher",
    {
      schema: {
        description: "Close the TV launcher.",
        response: {
          200: {
            type: "object",
            properties: {
              returnValue: { type: "boolean" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const response = await tvHandler.closeLauncher();
        return reply.send(response.payload);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 37: getAppState
  app.get(
    "/app-state/:id",
    {
      schema: {
        description: "Get the state of a specific app on the TV.",
        params: {
          type: "object",
          properties: {
            id: { type: "string", description: "ID of the app." },
          },
          required: ["id"],
        },
        // TODO: response
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
      const { id } = request.params;
      try {
        const appState = await tvHandler.getAppState(id);
        return reply.send(appState);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 38: getSystemInfo
  app.get(
    "/system-info",
    {
      schema: {
        description: "Get the system information from the TV.",
        // TODO: response
      },
    },
    async (request, reply) => {
      try {
        const systemInfo = await tvHandler.getSystemInfo();
        return reply.send(systemInfo);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 39: getSystemSettings
  app.get(
    "/system-settings",
    {
      schema: {
        description: "Get the current system settings from the TV.",
        // TODO: response
      },
    },
    async (request, reply) => {
      try {
        const systemSettings = await tvHandler.getSystemSettings();
        return reply.send(systemSettings);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 40: channelDown
  app.post(
    "/channel-down",
    {
      schema: {
        description: "Decrease the TV channel.",
        response: {
          200: {
            type: "object",
            properties: {
              returnValue: { type: "boolean" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const response = await tvHandler.channelDown();
        return reply.send(response.payload);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 41: channelUp
  app.post(
    "/channel-up",
    {
      schema: {
        description: "Increase the TV channel.",
        response: {
          200: {
            type: "object",
            properties: {
              returnValue: { type: "boolean" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const response = await tvHandler.channelUp();
        return reply.send(response.payload);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 42: getChannels
  app.get(
    "/channels",
    {
      schema: {
        description: "Get the list of available TV channels.",
        // TODO: response
      },
    },
    async (request, reply) => {
      try {
        const channels = await tvHandler.getChannels();
        return reply.send(channels);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 43: getChannelInfo
  app.get(
    "/channel-info/:channelId",
    {
      schema: {
        description: "Get the information about a specific TV channel.",
        params: {
          type: "object",
          properties: {
            channelId: { type: "string", description: "ID of the channel." },
          },
          required: ["channelId"],
        },
        // TODO: response
      },
    },
    async (
      request: FastifyRequest<{ Params: { channelId: string } }>,
      reply
    ) => {
      const { channelId } = request.params;
      try {
        const channelInfo = await tvHandler.getChannelInfo(channelId);
        return reply.send(channelInfo);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 44: getCurrentChannel
  app.get(
    "/current-channel",
    {
      schema: {
        description: "Get the current active TV channel.",
        // TODO: response
      },
    },
    async (request, reply) => {
      try {
        const currentChannel = await tvHandler.getCurrentChannel();
        return reply.send(currentChannel);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 45: setChannel
  app.post(
    "/set-channel",
    {
      schema: {
        description: "Set the TV to a specific channel.",
        body: {
          type: "object",
          properties: {
            channelId: {
              type: "string",
              description: "ID of the channel to switch to.",
            },
          },
          required: ["channelId"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              returnValue: { type: "boolean" },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: { channelId: string } }>, reply) => {
      const { channelId } = request.body;
      try {
        const response = await tvHandler.setChannel(channelId);
        return reply.send(response.payload);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 46: takeScreenshot
  app.post(
    "/take-screenshot",
    {
      schema: {
        description: "Take a screenshot from the TV.",
        response: {
          200: {
            type: "object",
            properties: {
              returnValue: { type: "boolean" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const response = await tvHandler.takeScreenshot();
        return reply.send(response.payload);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 47: closeWebApp
  app.post(
    "/close-web-app",
    {
      schema: {
        description: "Close the web app currently running on the TV.",
        response: {
          200: {
            type: "object",
            properties: {
              returnValue: { type: "boolean" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const response = await tvHandler.closeWebApp();
        return reply.send(response.payload);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 48: getInputSocket
  app.get(
    "/input-socket",
    {
      schema: {
        description: "Get the current input socket in use on the TV.",
        // TODO: response
      },
    },
    async (request, reply) => {
      try {
        const inputSocket = await tvHandler.getInputSocket();
        return reply.send(inputSocket);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 49: getCalibration
  app.get(
    "/calibration",
    {
      schema: {
        description: "Get the current calibration settings from the TV.",
        // TODO: response
      },
    },
    async (request, reply) => {
      try {
        const calibration = await tvHandler.getCalibration();
        return reply.send(calibration);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 50: setCalibration
  app.post(
    "/set-calibration",
    {
      schema: {
        description: "Set the calibration settings on the TV.",
        body: {
          type: "object",
          properties: {
            calibration: {
              type: "object",
              description: "Calibration data to set.",
            },
          },
          required: ["calibration"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              returnValue: { type: "boolean" },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: { calibration: any } }>, reply) => {
      const { calibration } = request.body;
      try {
        const response = await tvHandler.setCalibration(calibration);
        return reply.send(response.payload);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 51: turnOffScreen
  app.post(
    "/turn-off-screen",
    {
      schema: {
        description: "Turn off the screen of the TV.",
        response: {
          200: {
            type: "object",
            properties: {
              returnValue: { type: "boolean" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const response = await tvHandler.turnOffScreen();
        return reply.send(response.payload);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 52: turnOnScreen
  app.post(
    "/turn-on-screen",
    {
      schema: {
        description: "Turn on the screen of the TV.",
        response: {
          200: {
            type: "object",
            properties: {
              returnValue: { type: "boolean" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const response = await tvHandler.turnOnScreen();
        return reply.send(response.payload);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 53: getConfigs
  app.get(
    "/configs",
    {
      schema: {
        description: "Get the current configuration settings of the TV.",
        // TODO: response
      },
    },
    async (request, reply) => {
      try {
        const configs = await tvHandler.getConfigs();
        return reply.send(configs);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 54: listDevices
  app.get(
    "/list-devices",
    {
      schema: {
        description: "List all devices connected to the TV.",
        response: {
          200: {
            type: "object",
            properties: {
              subscribed: {
                type: "boolean",
              },
              returnValue: {
                type: "boolean",
              },
              devices: {
                type: "array",
                items: {
                  deviceId: {
                    type: "string",
                  },
                  deviceUri: {
                    type: "string",
                  },
                  deviceType: {
                    type: "string",
                  },
                  deviceName: {
                    type: "string",
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const devices = await tvHandler.listDevices();
        return reply.send(devices.payload);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 55: showInputPicker
  app.post(
    "/show-input-picker",
    {
      schema: {
        description: "Show the input picker on the TV.",
        response: {
          200: {
            type: "object",
            properties: {
              returnValue: { type: "boolean" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const response = await tvHandler.showInputPicker();
        return reply.send(response.payload);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 56: activateScreensaver
  app.post(
    "/activate-screensaver",
    {
      schema: {
        description: "Activate the screensaver on the TV.",
        response: {
          200: {
            type: "object",
            properties: {
              returnValue: { type: "boolean" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const response = await tvHandler.activateScreensaver();
        return reply.send(response.payload);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  // Method 57: reboot
  app.post(
    "/reboot",
    {
      schema: {
        description: "Reboot the TV.",
        response: {
          200: {
            type: "object",
            properties: {
              returnValue: { type: "boolean" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const response = await tvHandler.reboot();
        return reply.send(response.payload);
      } catch (error) {
        return reply.status(500).send({ error: error });
      }
    }
  );

  done();
});
