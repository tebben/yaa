import { spawnSync } from "node:child_process";

const env = { ...process.env };
if (process.platform === "linux") {
	delete env["WAYLAND_DISPLAY"];
	env["XDG_SESSION_TYPE"] = "x11";
}

const run = (command: string, args: string[]) => {
	const result = spawnSync(command, args, { stdio: "inherit", env });
	if (result.error) {
		console.error(`Could not run ${command}: ${result.error.message}`);
		process.exit(1);
	}
	if (result.status !== 0) process.exit(result.status ?? 1);
};

if (process.platform === "linux") {
	const xvfb = spawnSync("xvfb-run", ["--help"], { stdio: "ignore" });
	if (xvfb.error) {
		console.error("Pre-push requires xvfb-run, Xvfb and xauth on Linux.");
		process.exit(1);
	}
}

run("pnpm", ["run", "check:all"]);
if (process.platform === "linux") {
	// The window fits itself to the screen, and some distributions' default,
	// 640x480, is too small for the smoke test.
	run("xvfb-run", [
		"--auto-servernum",
		"--server-args=-screen 0 1280x1024x24",
		"pnpm",
		"run",
		"smoke",
	]);
} else {
	run("pnpm", ["run", "smoke"]);
}
