# tf2remote
Connects TF2 Party Chat with Discord

![Preview](https://i.imgur.com/X0o7hxT.png)

## Getting started
1. Create a `src/settings.json` (See [example.settings.json](src/example.settings.json))<br>
Most fields should be self-explanatory. To avoid breaking Discord's ToS you should use a bot token instead of your user token. And the discord channel should be a text channel you have permission to write on obviously.
2. `npm i` to install all the packages.
3. Launch `run.bat` to start the program. (TF2 must be running or it won't work)
4. Discord messages will now appear in party chat! You can reply within the party chat itself aswell!

Note: To be able to send messages from TF2 to Discord, you must have the console command `tf_mm_partyclient_debug` set to `1`.

## Commands
- `/server` - Sends server information to Discord (Updates on each new server join)
- `/disable` - Disables the program (You can't send messages anymore and won't receive any from Discord)
- `/enable` - Enables it back
- `/status` - Shows Discord hook status
- `/channels` - Shows a list of available channels to connect to
- `/channel` - Shows current channel connected to
- `/channel <name>` - Switches to different channel

## Known Issues
- If your TF2 lags a lot (E.g. alt-tab lag) the program might send messages twice.
- Isn't really an issue with this program but TF2 seems to lag when a party message gets sent/received. You can avoid it by leaving the chat open in the main menu.
- Probably has a lot of issues I haven't tested.
