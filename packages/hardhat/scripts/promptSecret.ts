// promptSecret.ts
import readline from "readline";

export function promptSecret(query: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(query);

    // Ensure raw mode
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    let input = "";

    const onData = (char: Buffer) => {
      const c = char.toString();

      // ENTER ends input
      if (c === "\n" || c === "\r") {
        process.stdin.setRawMode(false);
        process.stdout.write("\n");
        process.stdin.removeListener("data", onData);
        resolve(input);
        return;
      }

      // BACKSPACE
      if (c === "\u0008" || c === "\u007f") {
        input = input.slice(0, -1);
        return;
      }

      // Append silently
      input += c;
    };

    process.stdin.on("data", onData);
  });
}