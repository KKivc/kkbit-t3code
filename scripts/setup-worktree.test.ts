// @effect-diagnostics nodeBuiltinImport:off -- 在无项目依赖的临时目录中验证初始化子进程。
import * as NodeChildProcess from "node:child_process";
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import * as NodeUtil from "node:util";
import { expect, it } from "vite-plus/test";

const execute = NodeUtil.promisify(NodeChildProcess.execFile);

function fixture(exitCode = 0) {
  const root = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "t3-setup-test-"));
  const project = NodePath.join(root, "main checkout");
  const worktree = NodePath.join(root, "new worktree");
  const bin = NodePath.join(project, "node_modules", ".bin");
  NodeFS.mkdirSync(bin, { recursive: true });
  NodeFS.mkdirSync(NodePath.join(worktree, "scripts"), { recursive: true });
  NodeFS.copyFileSync(
    new URL("./setup-worktree.ts", import.meta.url),
    NodePath.join(worktree, "scripts", "setup-worktree.ts"),
  );
  const installer = NodePath.join(project, "installer.cjs");
  NodeFS.writeFileSync(
    installer,
    `const fs = require("node:fs");
fs.writeFileSync("install.json", JSON.stringify(process.argv.slice(2)));
if (${exitCode} !== 0) { console.error("依赖安装失败：测试夹具"); process.exit(${exitCode}); }
fs.mkdirSync("node_modules", { recursive: true });
fs.writeFileSync("node_modules/.modules.yaml", "{}");
`,
  );
  const windows = NodePath.sep === "\\";
  NodeFS.writeFileSync(
    NodePath.join(bin, windows ? "vp.cmd" : "vp"),
    windows
      ? `@echo off\r\n"${process.execPath}" "${installer}" %*\r\n`
      : `#!/bin/sh\nexec '${process.execPath}' '${installer}' "$@"\n`,
    { mode: 0o755 },
  );
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => key.toLowerCase() !== "path"),
  );
  env.PATH = [
    NodePath.dirname(process.execPath),
    ...(windows ? [NodePath.join(process.env.SystemRoot!, "System32")] : ["/usr/bin", "/bin"]),
  ].join(NodePath.delimiter);
  env.T3CODE_PROJECT_ROOT = project;
  return {
    root,
    project,
    worktree,
    run: () => execute(process.execPath, ["scripts/setup-worktree.ts"], { cwd: worktree, env }),
    [Symbol.dispose]() {
      NodeFS.rmSync(root, { recursive: true, force: true });
    },
  };
}

it("后台 PATH 没有 vp 时使用主仓库命令，并保持环境文件隔离", async () => {
  using setup = fixture();
  for (const directory of [setup.project, setup.worktree]) {
    NodeFS.mkdirSync(NodePath.join(directory, "infra", "relay"), { recursive: true });
  }
  NodeFS.writeFileSync(NodePath.join(setup.project, ".env"), "测试夹具，不是真实凭据\n");
  NodeFS.writeFileSync(NodePath.join(setup.project, "infra", "relay", ".env"), "测试夹具\n");
  const localEnv = NodePath.join(setup.worktree, ".env.local");
  NodeFS.writeFileSync(localEnv, "保留 worktree 自有配置\n");

  await setup.run();

  expect(
    JSON.parse(NodeFS.readFileSync(NodePath.join(setup.worktree, "install.json"), "utf8")),
  ).toEqual(["i", "--frozen-lockfile", "--", "--yes"]);
  expect(NodeFS.existsSync(NodePath.join(setup.worktree, ".env"))).toBe(false);
  expect(NodeFS.existsSync(NodePath.join(setup.worktree, "infra", "relay", ".env"))).toBe(false);
  expect(NodeFS.readFileSync(localEnv, "utf8")).toBe("保留 worktree 自有配置\n");
  expect(NodeFS.existsSync(NodePath.join(setup.worktree, ".t3", "setup-done"))).toBe(true);
  expect(NodeFS.existsSync(NodePath.join(setup.worktree, ".t3", "setup-running"))).toBe(false);
  expect(NodeFS.existsSync(NodePath.join(setup.worktree, ".t3", "setup-failed"))).toBe(false);
});

it("安装失败保留退出码与错误，不产生成功标记", async () => {
  using setup = fixture(7);

  await expect(setup.run()).rejects.toMatchObject({ code: 7 });

  expect(
    NodeFS.readFileSync(NodePath.join(setup.worktree, ".t3", "setup-failed"), "utf8"),
  ).toContain("依赖安装失败：测试夹具");
  expect(NodeFS.existsSync(NodePath.join(setup.worktree, ".t3", "setup-running"))).toBe(false);
  expect(NodeFS.existsSync(NodePath.join(setup.worktree, ".t3", "setup-done"))).toBe(false);
});
