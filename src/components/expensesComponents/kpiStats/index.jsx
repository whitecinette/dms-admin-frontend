import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { ArrowUp, ArrowDown } from "lucide-react";
import './style.scss';

const KPIStatCard = ({ title, value, change, data, icon }) => {
  const isPositive = change >= 0;

  return (
    <div className="kpi-card">
      {/* Header */}
      <div className="kpi-header">
        {icon && <div className="kpi-icon">{icon}</div>}
        <span className="kpi-title">{title}</span>
      </div>

      {/* Value */}
      <div className="kpi-value">{value}</div>

      {/* Footer row with % change and mini-chart */}
      <div className="kpi-footer">
        <span
          className="kpi-change"
          style={{ color: isPositive ? "#22c55e" : "#ef4444" }}
        >
          {isPositive ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
          {Math.abs(change)}% vs last month
        </span>

        <div className="kpi-mini-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barCategoryGap={2}>
              <Bar
                dataKey="value"
                fill={isPositive ? "#4E79A7" : "#E15759"}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default KPIStatCard;
    