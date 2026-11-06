import { describe, expect, it } from "vite-plus/test";

import { translateUi } from "./translate";

describe("界面翻译", () => {
  it("按语言选择文案，并保持品牌名和未知技术值", () => {
    expect(translateUi("Settings", [], "zh-CN")).toBe("设置");
    expect(translateUi("Settings", [], "en")).toBe("Settings");
    expect(translateUi("T3 Code", [], "zh-CN")).toBe("T3 Code");
    expect(translateUi("gpt-5.4", [], "zh-CN")).toBe("gpt-5.4");
    expect(translateUi("?", [], "zh-CN")).toBe("?");
  });

  it("按中文语序排列插值，并保持插值内容原样", () => {
    expect(translateUi("Read {0}'s cookies for this import.", ["My Browser"], "zh-CN")).toBe(
      "为此次导入读取 My Browser 的 Cookie。",
    );
    expect(translateUi("{0} can now be reached over SSH {1}.", ["My PC", "host"], "zh-CN")).toBe(
      "现在可通过 SSH host 访问 My PC。",
    );
    expect(translateUi("Unknown {0}", ["${unchanged}"], "zh-CN")).toBe("Unknown ${unchanged}");
    expect(translateUi("Add an alias for {0}", ["O'Reilly"], "zh-CN")).toBe("为 O'Reilly 添加别名");
    expect(
      translateUi(
        "Transcribe speech on {0} and use voice input across environments.",
        ["My PC"],
        "zh-CN",
      ),
    ).toBe("在 My PC 上转录语音，并跨环境使用语音输入。");
    expect(translateUi("Composer: Start or Finish Dictation", [], "zh-CN")).toBe(
      "输入框：开始或结束听写",
    );
  });
});
