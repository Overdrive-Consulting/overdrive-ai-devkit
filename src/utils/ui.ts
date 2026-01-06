import gradient from "gradient-string";
import pc from "picocolors";
import chalkAnimation from "chalk-animation";
import { createSpinner } from "nanospinner";
import boxen from "boxen";
import { createConsola } from "consola";

const consola = createConsola({
  formatOptions: {
    date: false,
  },
});

const BANNER = `
   ___   ____  __ __
  / _ | / __ \\/ //_/
 / __ |/ /_/ / ,<
/_/ |_|\\____/_/|_|
`;

export async function printBanner(): Promise<void> {
  const coolGradient = gradient(["#6366f1", "#8b5cf6", "#a855f7"]);

  if (process.stdout.isTTY) {
    const anim = chalkAnimation.rainbow(BANNER);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    anim.stop();
    process.stdout.write("\x1B[5A\x1B[0J"); // Clear animation, reprint static
  }

  consola.log(coolGradient(BANNER));
  consola.log(pc.dim("  Bootstrap AI coding tools into your project\n"));
}

export function printSuccess(message: string) {
  consola.success(message);
}

export function printError(message: string) {
  consola.error(message);
}

export function printInfo(message: string) {
  consola.info(message);
}

export function printWarning(message: string) {
  consola.warn(message);
}

export function printStep(step: number, total: number, message: string) {
  consola.info(`[${step}/${total}] ${message}`);
}

export function spinner(text: string) {
  return createSpinner(text).start();
}

export function printSuccessBox(lines: string[]) {
  consola.log(
    boxen(lines.join("\n"), {
      padding: 1,
      borderStyle: "round",
      borderColor: "green",
    })
  );
}
