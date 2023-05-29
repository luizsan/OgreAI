@echo off

if not exist build (
    cd client
    start "" /b /wait cmd /c "npm install"
    start "" /wait cmd /c "npm run build"
    cd ..
)

cd server
start "" /b /wait cmd /c "npm install"
start "" cmd /c "npm run start"
cd ..

exit