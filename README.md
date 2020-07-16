# tf2remote
Connects TF2 Party Chat with Discord

![Preview](https://i.imgur.com/fwfy050.png)

## Getting started
1. Create a `settings.json` (See [settings.example.json](settings.example.json))
2. `npm i` to install all the packages.
3. Append `-usercon` inside your TF2 launch options.
4. Launch `run.bat` to start the program. (TF2 must be running or it won't work)

## Commands
- `/channel` - Shows current channel connected to
- `/status` - Shows Discord hook status
- `/enable` - Enables it back
- `/disable` - Disables the program (You can't send messages anymore and won't receive any from Discord)

## Known Issues
- Starting the program when inside your own local server will make it freeze for a few seconds. (Probably cuz its changing ports)
- Isn't really an issue with this program but TF2 seems to lag when a party message gets sent/received. You can avoid it by leaving the chat open in the main menu.

More commands to come!
