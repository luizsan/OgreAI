@echo off

cd server
start "" /b /wait cmd /c "npm install"
start "" cmd /c "npm run start"
cd ..

cd client
start "" /b /wait cmd /c "npm install"
start "" cmd /c "npm run host"
cd ..

exit