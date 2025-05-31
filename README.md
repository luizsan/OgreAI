# OgreAI
Light, fast, easy to use and bloat-free interface for AI chatbots.

![](https://raw.githubusercontent.com/luizsan/OgreAI/main/docs/img/sample_chat.png)

# Requirements
 - [Bun](https://bun.sh/) (1.2.10 or higher)

### Recommended
 - [Visual Studio Code](https://code.visualstudio.com/)
 - Any git client

# How to use
If you have no idea what you're doing and just want to run the project, execute the `build.bat` file at the project root folder and wait until it finishes building. After that, run `ogreai.exe` in the output folder that will show up.

Your content files (characters, chats, configs) will be located in the `user` directory, one level above the `output` directory. To modify this location, edit the user path in the `config.json` file found inside the `output` directory.

# Development
Run `install.bat` to install the necessary dependencies quickly, without building the project.

To do it manually:
```sh
cd client
npm install
cd ../server
bun install
```

## Running
To start a server, go to the server folder and run:
```
bun run index
```

To run the dev version of the client, go to the client folder and run:
```
bun run dev
```

## Building
⚠️ Building is not neccessary if you're using the development environment.

To build the server binary, go to the server folder and run:
```
bun build --compile --target=bun index.ts
```

To build the client page, go to the client folder and run:
```
bun run build
```

# Planned features
 - Customizable chat colors
 - Group chats
