# lgtv-ts

TypeScript methods to command LG's WebOS TVs. Connects to the WebSocket endpoint on the TV and registers itself with a prompt. Automatically reconnects itself and includes a few extra functions I personally use.

## About the project

A part of my mediacenter implementation, this is mostly for my personal use but made freely available to anyone. PRs welcome, fork it, do whatever. LG's TVs moved to self signed certs on their TV's, which most clients reject. After fiddling with already existing and having to resort to node ignoring all TLS errors, I decided to write my own. This is still WIP, the return types are not all mapped out.

## Installation

`npm i lgtv-ts`

## Usage

```TypeScript
import { LGTVHandler } from "lgtv-ts";

  /**
   * Initializes a new instance of the LGTVHandler class.
   * @param protocol - The WebSocket protocol ('ws' or 'wss').
   * @param ip - The IP address of the LG TV.
   * @param port - The port number for the WebSocket connection.
   * @param macAddress - The MAC address of the LG TV for WOL.
   * @param keyPath - (Optional) Custom path for storing client keys. Defaults to './keys'.
   */

const tvHandler = new LGTVHandler(
  // older models might still accept ws
  "wss",
  "192.168.0.57",
  // 3000 for ws, 3001 for wss
  3001,
  "F2:B4:5C:7D:4A:2A",
  // optional path to a folder for storing client keys
  "./keys"
);
```

### Examples

Get a list of available apps

```TypeScript
const apps = await tvHandler.getApps()
```

Launch an app by its ID

```TypeScript
await tvHandler.launchApp("netflix")
```

Show the TV's input picker

```TypeScript
await tvHandler.showInputPicker()
```

Get a list of available inputs

```TypeScript
await tvHandler.getInputs()
```

Inputs are mapped by their names and IDs, most TVs only have HDMI inputs available, and you can easily switch between their ports

```TypeScript
// just replace 1 with any other port number
await tvHandler.setInput("HDMI_1")
```
Changing the sound output is very similar, here we have an enum type to help us

```TypeScript
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
```
Set audio output
```TypeScript
await tvHandler.setSoundOutput(SoundOutput.HDMI_ARC)
```

As my TV is super finicky about switching to my eARC channel, I created a method that constantly checks if the output is wrong and sets it to the right one

Check the documentation for further details

```TypeScript
await tvHandler.audioChecker(SoundOutput.HDMI_ARC)
// stop it 
tvHandler.stopAudioChecker()
```

## Documentation

[TypeDoc](https://telaak.github.io/lgtv-ts/)

## License

```
MIT License

Copyright (c) 2024 Teemu L.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
