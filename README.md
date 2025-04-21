# OgreAI
Light, fast, easy to use and bloat-free interface for AI chatbots.

![](https://raw.githubusercontent.com/luizsan/OgreAI/main/docs/img/sample_chat.png)

# Requirements
### Server
 - [Bun 1.2.10 or higher](https://bun.sh/)
### Client
 - [Node.js 18.16.0 or higher](https://nodejs.org/)

### Recommended
 - [Visual Studio Code](https://code.visualstudio.com/)
 - Any git client

# How to use
If you have no idea what you're doing and just want to run the project, execute the `build.bat` file at the project root folder and wait until it finishes building. After that, run `ogreai.exe` in the output folder.

Your content will be located inside the `user` folder.

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
To start a server
```
bun run index.ts
```

To run the dev version of the client
```
npm run dev
```

## Building
Building is not neccessary if you're using the development environment.

Building the server
```
bun build --compile --target=bun index.ts
```

Building the client
```
vite build
```

# Planned features
 - Customizable chat colors
 - Group chats
