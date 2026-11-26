import { LazyEChart } from "./LazyEChart";
import type { Journey } from "../types";

export function JourneyChart({ journey }: { journey: Journey }) {
  const isLongJourney = journey.events.length > 12;
  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: isLongJourney ? Math.max(1000, journey.events.length * 82) : undefined }}>
        <LazyEChart
          style={{ height: 350, width: isLongJourney ? Math.max(1000, journey.events.length * 82) : "100%" }}
          notMerge
          option={{
            color: ["#615eea", "#55a9d8", "#e79a3d"],
            grid: { left: 58, right: 58, top: 42, bottom: isLongJourney ? 98 : 72 },
            tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, borderColor: "#e2e8f0", textStyle: { color: "#0f172a" } },
            legend: { data: ["Active users", "Event count", "Population drop"], bottom: isLongJourney ? 28 : 0, textStyle: { color: "#64748b", fontSize: 11 } },
            dataZoom: isLongJourney ? [
              { type: "inside", xAxisIndex: 0, zoomOnMouseWheel: true, moveOnMouseMove: true },
              { type: "slider", xAxisIndex: 0, bottom: 2, height: 16, borderColor: "transparent", backgroundColor: "#f1f5f9", fillerColor: "#c7d2fe" },
            ] : undefined,
            xAxis: {
              type: "category",
              data: journey.events.map((event) => event.eventName),
              axisLabel: { rotate: journey.events.length > 5 ? 40 : 0, interval: journey.events.length > 12 ? Math.ceil(journey.events.length / 30) - 1 : 0, color: "#94a3b8", width: 105, overflow: "truncate" },
              axisLine: { lineStyle: { color: "#e2e8f0" } },
            },
            yAxis: [
              { type: "value", name: "Users / events", axisLabel: { color: "#94a3b8" }, splitLine: { lineStyle: { color: "#eef2f7" } } },
              { type: "value", name: "Drop %", axisLabel: { formatter: "{value}%", color: "#94a3b8" }, splitLine: { show: false } },
            ],
            series: [
              { name: "Active users", type: "bar", data: journey.events.map((event) => event.activeUsers), barMaxWidth: 28, itemStyle: { borderRadius: [4, 4, 0, 0] } },
              { name: "Event count", type: "bar", data: journey.events.map((event) => event.eventCount), barMaxWidth: 28, itemStyle: { borderRadius: [4, 4, 0, 0] } },
              {
                name: "Population drop",
                type: "line",
                yAxisIndex: 1,
                data: journey.events.map((event) => event.dropPercentage === null ? null : Number(event.dropPercentage.toFixed(1))),
                connectNulls: false,
                symbolSize: 6,
                lineStyle: { color: "#e79a3d", width: 2 },
                itemStyle: { color: "#e79a3d" },
              },
            ],
          }}
        />
      </div>
    </div>
  );
}
