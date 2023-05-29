# OgreAI
A clean and modular AI chatbot client

![](https://raw.githubusercontent.com/luizsan/OgreAI/main/docs/img/sample_chat.png)

### Features
 - Light, fast, easy to use and bloat-free interface
 - Creating and editing characters' names, description and other attributes
 - Editing, regenerating, "swiping" and streaming messages
 - Creating, renaming, duplicating and deleting chats
 - Scriptable modular API, doesn't need to rewrite source code to implement new API accessibility
 - Refresh characters and user data without reloading the page

# Requirements
 - [Node.js 18.16.0 or higher](https://nodejs.org/)

### Recommended
 - [Visual Studio Code](https://code.visualstudio.com/)
 - Any git client

# How to use
If you just want to run the project or has no idea what you're doing, just execute `open_normal.bat` and wait. This will build the project page and start the server automatically.

# Development
Execute `open_dev.bat` to start a dev environment of the project. To do it manually, follow the steps below.

## Installation
Run `npm install` on both client and server folders, like this:
```sh
cd client
npm install
cd ./server
npm install
```

## Running
To start the server, use:
```sh
cd server
npm run start
```
To run the dev version of the client, use:
```sh
cd client
npm run dev
```
or if you want it to be accessible on the network:
```sh
cd client
npm run host
```

## Building
Building is not neccessary if you're using the development environment, but the server will try to open the `build` folder.
```sh
cd client
npm run build
```

# To-do
 - Customize chat colors and background
 - Sort modes and search for characters list
 - Importing/exporting characters and chats to/from other formats

# Known issues
 - Changing a character's greeting doesn't update the current chat immediately (need to create a new one)
 - Changing a character's avatar does not update it immediately
 - Editing a message scrolls the chat incorrectly
 - Shortcuts for editing messages aren't implemented yet