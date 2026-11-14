import zhCN from "./zh-CN.json" with { type: "json" };

const messages: Readonly<Record<string, string>> = zhCN;

/** 仅供源码中明确标记的界面文案使用，不处理用户输入或技术标识。 */
export function translateUi(
  source: string,
  values: readonly unknown[] = [],
  locale: string = typeof document === "undefined" ? "en" : document.documentElement.lang,
): string {
  const message = locale.toLowerCase().startsWith("zh") ? (messages[source] ?? source) : source;
  return message.replace(/\{(\d+)\}/g, (placeholder: string, index: string) => {
    const position = Number(index);
    return position < values.length ? String(values[position]) : placeholder;
  });
}
