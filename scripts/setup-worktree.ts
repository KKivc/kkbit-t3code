// @effect-diagnostics nodeBuiltinImport:off - runs before `vp i`, so only Node built-ins exist.
import * as NodeChildProcess from "node:child_process";
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";

const worktree = NodePath.dirname(import.meta.dirname);

// T3 runs setup in the background, so agents can start before it ends.
// `setup-running` holds this PID until setup ends with `setup-done` or
// `setup-failed`, so agents wait instead of racing it with their own `vp i`.
const markerDir = NodePath.join(worktree, ".t3");
const runningMarker = NodePath.join(markerDir, "setup-running");
const doneMarker = NodePath.join(markerDir, "setup-done");
const failedMarker = NodePath.join(markerDir, "setup-failed");
NodeFS.rmSync(doneMarker, { force: true });
NodeFS.rmSync(failedMarker, { force: true });
NodeFS.mkdirSync(markerDir, { recursive: true });
NodeFS.writeFileSync(runningMarker, `${process.pid}\n`);
let failureDetail = "";
process.on("uncaughtExceptionMonitor", (error) => {
  failureDetail = error.stack ?? String(error);
});
process.on("exit", (code) => {
  if (code === 0) NodeFS.writeFileSync(doneMarker, "");
  else NodeFS.writeFileSync(failedMarker, `Setup exited with code ${code}.\n${failureDetail}\n`);
  NodeFS.rmSync(runningMarker, { force: true });
});
// A cancelled setup must still leave a marker, or agents would wait forever.
// During install, the signal goes on to the installer and setup exits when the
// install output closes. Any child the shell leaves behind holds that output
// open, so no marker appears while `vp i` can still write node_modules.
let cancelSignal: NodeJS.Signals | undefined;
let activeInstall: NodeChildProcess.ChildProcess | undefined;
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
  process.on(signal, () => {
    cancelSignal = signal;
    if (activeInstall) activeInstall.kill(signal);
    else process.exit(1);
  });
}

const projectRoot = process.env.T3CODE_PROJECT_ROOT;
if (!projectRoot) {
  throw new Error("T3CODE_PROJECT_ROOT is not set. Run this through the t3.json setup action.");
}

// 新 worktree 尚无依赖；借用主仓库的命令入口，不共享依赖目录或环境文件。
const installEnv = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => key.toLowerCase() !== "path"),
);
const inheritedPath = Object.entries(process.env).find(
  ([key]) => key.toLowerCase() === "path",
)?.[1];
installEnv.PATH = [
  NodePath.join(worktree, "node_modules", ".bin"),
  NodePath.join(projectRoot, "node_modules", ".bin"),
  ...(inheritedPath ? [inheritedPath] : []),
].join(NodePath.delimiter);

// shell 支持 Windows 命令入口；锁文件不一致或安装失败时保留真实错误。
const install = NodeChildProcess.spawn("vp i --frozen-lockfile -- --yes", {
  cwd: worktree,
  env: installEnv,
  shell: true,
  stdio: ["ignore", "pipe", "pipe"],
});
activeInstall = install;
let installOutput = "";
for (const [source, target] of [
  [install.stdout, process.stdout],
  [install.stderr, process.stderr],
] as const) {
  source.setEncoding("utf8");
  source.on("data", (chunk: string) => {
    target.write(chunk);
    installOutput = (installOutput + chunk).slice(-8_000);
  });
}
const installStatus = await new Promise<number | null>((resolve) => install.on("close", resolve));
activeInstall = undefined;
if (installStatus !== 0 || cancelSignal) {
  failureDetail = cancelSignal
    ? `Cancelled by ${cancelSignal}.`
    : installOutput.trimEnd().split("\n").slice(-30).join("\n");
  process.exit(installStatus || 1);
}

// pnpm cannot clone or hardlink across filesystems, so a store on another
// device silently turns every worktree install into a full copy.
const storeDir: unknown = JSON.parse(
  NodeFS.readFileSync(NodePath.join(worktree, "node_modules", ".modules.yaml"), "utf8"),
).storeDir;
if (
  typeof storeDir === "string" &&
  NodeFS.statSync(storeDir).dev !== NodeFS.statSync(NodePath.join(worktree, "node_modules")).dev
) {
  process.stderr.write(
    [
      "",
      "WARNING: the pnpm store is on a different filesystem than this worktree.",
      `  store:    ${storeDir}`,
      `  worktree: ${worktree}`,
      "pnpm cannot hardlink or clone across filesystems, so it copied every package into node_modules.",
      "Fix: put the store on the worktree's filesystem, for example:",
      `  pnpm config set store-dir ${JSON.stringify(NodePath.join(NodePath.dirname(worktree), ".pnpm-store"))} --global`,
      "",
      "",
    ].join("\n"),
  );
}
