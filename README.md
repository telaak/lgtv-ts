# Docker REST interface for controlling LG TVs

## About

This is a very thin Fastify layer over my lgtv-ts library, making it easier to control your TV. The image comes with Swagger generated documentation (return types WIP).

See the main branch's README for additional details, including setting up options for powering the TV on from sleep.

### docker-compose.yml

```Yaml
services:
  lgtv-ts:
    image: telaaks/lgtv-ts-fastify
    container_name: lgtv-ts
    ports:
      - 3000:3000
      # Needed for sending Wake-On-Lan packets
      - 9:9/udp
    volumes:
      - keys:/app/keys
    environment:
      - TV_PROTOCOL=wss
      - TV_IP=192.168.0.57
      - TV_PORT=3001
      - TV_MAC=F8:B9:5A:7B:5D:7C
      # Point this to the address you're using to access the container
      # Used for the documentation server's target for testing endpoints
      # - SERVER_URL=http://192.168.0.1:3000

volumes:
  keys:
```

Make sure fill the necessary environment variables:

1.  TV_PROTOCOL= ws for older models, wss for newer models
2.  TV_IP= self explanatory
3.  TV_PORT= 3000 for ws, 3001 for wss
4.  TV_MAC= the MAC address for the TV, older models need this for Wake-On-Lan
5.  SERVER_URL= optionally fill this in to make the Swagger documentation page's methods go to the right place

## Documentation

If nothing went wrong, the documentation can be found at http://DOCKER-IP:3000/docs

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
