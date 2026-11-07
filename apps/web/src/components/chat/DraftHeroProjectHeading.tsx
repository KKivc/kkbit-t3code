import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { observeResize } from "~/lib/observeResize";

export function DraftHeroProjectHeading({
  children,
  projectName,
}: {
  children: ReactNode;
  projectName: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inlineRef = useRef<HTMLSpanElement>(null);
  const [fitsInline, setFitsInline] = useState(false);

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- 通过 ResizeObserver 测量容器，选择行内或堆叠布局
  useLayoutEffect(() => {
    const container = containerRef.current;
    const inline = inlineRef.current;
    if (!container || !inline) return;

    // 独立测量完整行内标题，避免换行导致布局反复切换。
    const update = () =>
      setFitsInline(
        inline.getBoundingClientRect().width <= container.getBoundingClientRect().width,
      );
    update();
    return observeResize([container, inline], update);
  }, []);

  return (
    <div ref={containerRef} className="group/draft-hero relative w-full" data-inline={fitsInline}>
      <span
        aria-hidden="true"
        className="pointer-events-none invisible absolute inset-x-0 top-0 h-0 overflow-hidden"
      >
        <span
          ref={inlineRef}
          className="flex w-max items-baseline gap-2 whitespace-nowrap font-normal text-3xl tracking-tight"
        >
          <span>想构建什么？项目：</span>
          <span>
            <span className="font-medium">{projectName}</span>
          </span>
        </span>
      </span>
      <h1 className="flex w-full flex-col items-center justify-center gap-2 text-center font-normal text-2xl text-foreground tracking-tight sm:text-3xl lg:group-data-[inline=true]/draft-hero:flex-row">
        <span className="max-w-full lg:group-data-[inline=true]/draft-hero:shrink-0 [@media(max-height:28rem)]:sr-only">
          想构建什么
          <span className="lg:group-data-[inline=true]/draft-hero:hidden">？</span>
          <span className="hidden lg:group-data-[inline=true]/draft-hero:inline">？项目：</span>
        </span>
        <span className="flex min-w-0 max-w-full items-baseline justify-center text-base tracking-normal lg:group-data-[inline=true]/draft-hero:text-3xl lg:group-data-[inline=true]/draft-hero:tracking-tight">
          <span className="min-w-0">{children}</span>
        </span>
      </h1>
    </div>
  );
}
