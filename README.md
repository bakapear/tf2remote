# tf2remote
Connects TF2 Party Chat with Discord

## Getting started
1. Create a `src/settings.json` (See [example.settings.json](src/example.settings.json))<br>
Fields should be self-explanatory. To avoid breaking Discord's ToS you should use a bot token instead of your user token. And the discord channel should be a text channel you have permission to write on obviously.
2. Start TF2 first
3. Launch `run.bat` to start the program.
4. Discord messages will now appear in party chat! You can reply within the party chat itself aswell!

## Commands
- `/server` - Sends server information to Discord (Updates on each new server join)
- `/disable` - Disables the program (You can't send messages anymore and won't receive any from Discord)
- `/enable` - Enables it back

## Known Issues
- If you close TF2 but don't close the program, it will launch TF2 by itself when you receive a Discord message.
- If your TF2 lags a lot (E.g. alt-tab lag) the program might send messages twice.
- Isn't really an issue with this program but TF2 seems to lag when a party message gets sent/received. You can avoid it by leaving the chat open in the main menu.
- Probably has a lot of issues I haven't tested.
