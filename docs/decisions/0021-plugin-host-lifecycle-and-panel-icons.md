# 0021 Plugin host lifecycle, command activation and panel icons

Status: decided, 2026-11-26.

Context: M1 step 7 built the plugin host and the first contribution points (`docs/spec/03-plugins.md`). Three choices were open: when the host runs and how often it may crash, how a plugin is activated when someone runs one of its commands, and where a panel's rail icon comes from before the plugin's UI module has loaded.

Decision:
- **Host lifecycle.** The core starts the host on first use: a plugin with `onStartup`, or the first plugin command. The core notices a crash by the host's port closing, forgets every activation, and starts a new host on the next use (at once when an `onStartup` plugin needs it). After 3 crashes within 60 seconds it stops restarting until yaa restarts, and plugin commands fail with that reason. A new core always gets a new host.
- **Activation by command.** Running a command a manifest contributes activates its plugin first, so `activationEvents` does not repeat the commands. The only listed event in M1 is `onStartup`; later events (for example core events) join the same list.
- **Panel icons.** A panel's icon is an SVG file in the plugin folder, named in the manifest and drawn as a mask over the text colour. Rejected: a Lucide icon name, which needs either every Lucide icon in the app bundle or about 2,400 lazy chunks compiled into every build; and an icon exported from the UI module, which would load every plugin's UI module at startup to draw the rail.

Consequences: a plugin that crashes the host three times in a minute disables every plugin's backend until restart; per-plugin isolation can come later if that proves too coarse. Plugin authors copy an SVG (Lucide's are ISC) into their folder. A command whose handler the plugin never registered fails when it runs, with the reason in the footer.
