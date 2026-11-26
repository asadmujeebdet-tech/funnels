import { lazy, Suspense, type ComponentProps } from "react";

const EChart = lazy(() => import("./EChart").then((module) => ({ default: module.EChart })));
type Props = ComponentProps<typeof EChart>;

export function LazyEChart(props: Props) {
  const { style } = props;
  return (
    <Suspense fallback={<div className="skeleton w-full" style={{ height: style?.height ?? 320 }} />}>
      <EChart {...props} />
    </Suspense>
  );
}
