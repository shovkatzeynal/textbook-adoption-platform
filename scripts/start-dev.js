const { spawn } = require("child_process");

const commands = [
  { name: "backend", cmd: process.execPath, args: ["backend/server.js"] },
  { name: "frontend", cmd: process.execPath, args: ["scripts/start-frontend.js"] },
];

const children = [];
let shuttingDown = false;

const shutdown = (exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  children.forEach((child) => {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  });
  setTimeout(() => process.exit(exitCode), 100);
};

const startCommand = ({ name, cmd, args }) => {
  console.log(`Starting ${name}...`);
  const child = spawn(cmd, args, { stdio: "inherit", cwd: require("path").join(__dirname, "..") });

  child.on("exit", (code, signal) => {
    if (signal) {
      console.log(`${name} terminated by ${signal}`);
    } else {
      console.log(`${name} exited with code ${code}`);
    }
    shutdown(code || 0);
  });

  child.on("error", (error) => {
    console.error(`${name} failed to start.`);
    shutdown(1);
  });

  children.push(child);
};

["SIGINT", "SIGTERM", "SIGQUIT"].forEach((signal) =>
  process.on(signal, () => {
    console.log(`Received ${signal}, stopping processes...`);
    shutdown(0);
  })
);

commands.forEach(startCommand);
