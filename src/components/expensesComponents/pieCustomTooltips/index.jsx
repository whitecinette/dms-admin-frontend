import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import "./style.scss";

const COLORS = [
  "#4E79A7", "#F28E2B", "#E15759", "#76B7B2", "#59A14F",
  "#EDC949", "#AF7AA1", "#FF9DA7", "#9C755F", "#BAB0AC",
  "#2E93fA", "#66DA26", "#546E7A", "#E91E63", "#FF9800",
  "#8E44AD", "#1ABC9C", "#2ECC71", "#F39C12", "#D35400"
];

const CustomTooltip = ({ active, payload, data, coordinate, viewBox }) => {
  if (active && payload && payload.length && data) {
    const { x, y, width, height } = viewBox;
    const tooltipWidth = 220;  // estimate your tooltip width
    const tooltipHeight = 160; // estimate your tooltip height

    let posX = coordinate.x + 10;
    let posY = coordinate.y - tooltipHeight / 2; // center vertically by default

    // prevent right edge cutoff
    if (coordinate.x + tooltipWidth > x + width) {
      posX = coordinate.x - tooltipWidth - 10;
    }

    // prevent bottom cutoff
    if (coordinate.y + tooltipHeight > y + height) {
      posY = coordinate.y - tooltipHeight - 10;
    }

    // prevent top cutoff
    if (posY < y) {
      posY = coordinate.y + 10; // push below the point if too high
    }

    return (
      <div
        className="custom-tooltip"
        style={{
          position: "absolute",
          left: posX,
          top: posY,
          zIndex: 9999,
          background: "#fff",
          border: "1px solid #ddd",
          borderRadius: "8px",
          padding: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
        }}
      >
        {/* Mini pie chart inside tooltip */}
        <div className="tooltip-chart">
          <ResponsiveContainer width={120} height={120}>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" outerRadius={50}>
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Labels + Values */}
        <div className="tooltip-list">
          {data.map((item, i) => (
            <div key={i} className="tooltip-row">
              <span
                className="dot"
                style={{ background: COLORS[i % COLORS.length] }}
              ></span>
              <span className="label">{item.name}</span>
              <span className="value">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};


export default CustomTooltip;
