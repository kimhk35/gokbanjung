import { createInterface } from "node:readline/promises";
export async function ask(label, hidden = false) {
  if (!hidden) {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    try {
      return (await rl.question(label)).trim();
    } finally {
      rl.close();
    }
  }
  if (!process.stdin.isTTY)
    throw new Error("A terminal is required for secret input.");
  process.stdout.write(label);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");
  return new Promise((resolve, reject) => {
    let value = "";
    const cleanup = () => {
      process.stdin.off("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
    };
    function onData(chunk) {
      for (const c of chunk) {
        if (c === "\u0003") {
          cleanup();
          reject(new Error("Cancelled"));
          return;
        }
        if (c === "\r" || c === "\n") {
          cleanup();
          resolve(value.trim());
          return;
        }
        if (c === "\u007f" || c === "\b") {
          value = value.slice(0, -1);
        } else if (c >= " ") {
          value += c;
        }
      }
    }
    process.stdin.on("data", onData);
  });
}
