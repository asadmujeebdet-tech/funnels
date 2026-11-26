import ReactECharts from "echarts-for-react";
import type { Journey } from "../types";

export function JourneyChart({ journey }: { journey: Journey }) {
  return (
    <ReactECharts
      style={{ height: 330 }}
      notMerge
      option={{
        color: ["#3459e6", "#21a179"],
        grid: { left: 52, right: 52, top: 28, bottom: 76 },
        tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
        legend: { data: ["Active users", "Event count"], bottom: 0 },
        xAxis: {
          type: "category",
          data: journey.events.map((event) => event.eventName),
          axisLabel: { rotate: journey.events.length > 5 ? 35 : 0, interval: 0, color: "#718096" },
          axisLine: { lineStyle: { color: "#dce2ec" } },
        },
        yAxis: [
          { type: "value", name: "Users / events", axisLabel: { color: "#718096" }, splitLine: { lineStyle: { color: "#edf0f5" } } },
          { type: "value", name: "Drop %", axisLabel: { formatter: "{value}%", color: "#718096" }, splitLine: { show: false } },
        ],
        series: [
          { name: "Active users", type: "bar", data: journey.events.map((event) => event.activeUsers), barMaxWidth: 32, itemStyle: { borderRadius: [5, 5, 0, 0] } },
          { name: "Event count", type: "bar", data: journey.events.map((event) => event.eventCount), barMaxWidth: 32, itemStyle: { borderRadius: [5, 5, 0, 0] } },
          {
            name: "Drop %",
            type: "line",
            yAxisIndex: 1,
            data: journey.events.map((event) => event.dropPercentage === null ? null : Number(event.dropPercentage.toFixed(1))),
            connectNulls: false,
            symbolSize: 8,
            lineStyle: { color: "#e89037", width: 2 },
            itemStyle: { color: "#e89037" },
          },
        ],
      }}
    />
  );
}
