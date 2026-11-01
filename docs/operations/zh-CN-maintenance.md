# 维护中文界面

此 Fork 默认使用简体中文。Web 和 Windows 桌面版共用 `apps/web` 的界面；移动端与 Electron 原生菜单尚未迁移。

界面文案由 `apps/web/src/i18n/zh-CN.json` 集中管理，源码中的 `translateUi` 调用明确标记翻译范围。品牌、模型名、命令、配置键、路径和用户内容保留原文。页面语言由 HTML 的 `lang` 指定；中文页面使用中文词库，其他语言保留英文源文案。未收录的词条保留原文，不改写动态用户内容。

只同步 `pingdotgg/t3code` 已发布的 nightly Release 标签，不直接合并官方 `main`、稳定版或 preview。同步在专用 worktree `E:\Projects\kkbit-t3code-upstream-sync` 的 `automation/upstream-sync` 分支中执行，保留中文文案和 Windows 修复。当前代码已包含较新提交时不回退，等待后续 nightly。合并后检查冲突和新增文案，再运行 `vp run check:changed`。新增翻译沿用完整英文句子作为键；动态值使用 `{0}`、`{1}` 占位符，中文可以调整顺序。

构建自己的桌面发行版时，将 `T3CODE_DESKTOP_UPDATE_REPOSITORY` 设置为 `KKivc/kkbit-t3code`，使客户端检查本仓库的发行版本。尚未发布安装包时，不应把官方自动更新当作中文版本的更新来源。

Windows x64 发布沿用 `scripts/build-desktop-artifact.ts`，通过 `--build-version` 指定严格递增的 `X.Y.Z-nightly.YYYYMMDD.N` 版本。通常沿用官方 nightly 版本；低于本仓库已发布版本时递增本仓库版本，并在发行说明记录实际官方标签与源码提交。安装包、`.blockmap` 和 `nightly.yml` 一起上传到同一 GitHub 预发布版，使用 `--prerelease --latest=false`。不构建新的稳定版或 `latest.yml`，不删除历史发行版。客户端使用 nightly 通道，由用户确认下载和安装。

本次迁移复用了 MIT 许可的社区词库，来源为 `ZhiweiXiao98/t3code` 提交 `54bbd8f7f103d32f2231703d674a6b556f13b6d7`，并加入了本地补译和语序修正。上游及社区代码的 MIT 许可声明继续有效。
