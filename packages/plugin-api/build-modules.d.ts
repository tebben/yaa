// What the yaa plugin build makes of `import start from "<module>?worker"`:
// a function that runs the module in a new worker.
declare module "*?worker" {
	const start: () => Worker;
	export default start;
}

// A CSS file, which the build adds to the plugin's stylesheet.
declare module "*.css";
