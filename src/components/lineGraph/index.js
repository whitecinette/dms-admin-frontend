import React, { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

const colorPalette = [
    "#FF8000", "#33FF57", "#3380FF", "#FF33A6", "#A31ACB", "#FFD733",
    "#8DFF33", "#FF3333", "#33A6FF", "#E91E63", "#9C27B0", "#673AB7",
    "#3F51B5", "#2196F3", "#FFEB3B"
]

function LineGraph({ data }) {
  const [activeBrand, setActiveBrand] = useState(null);

  // Memoize brand colors to keep them consistent across renders
  const brandColors = useMemo(() => {
    const assignedColors = {};
    let colorIndex = 0;
    Object.keys(data[0]).forEach((brand) => {
      if (brand !== "month") {
        assignedColors[brand] = colorPalette[colorIndex % colorPalette.length];
        colorIndex++;
      }
    });
    return assignedColors;
  }, [data]); // Runs only when data changes

  const handleLegendHover = (data) => {
    setActiveBrand(data.value);
  };

  const handleLegendLeave = () => {
    setActiveBrand(null);
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <XAxis tick={{ fontSize: 10 }} dataKey="month" />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          <Legend onMouseEnter={handleLegendHover} onMouseLeave={handleLegendLeave} />
          
          {Object.keys(brandColors).map((brand) => (
            <Line
              key={brand}
              type="monotone"
              dataKey={brand}
              stroke={brandColors[brand]}
              strokeWidth={2}
              opacity={activeBrand && activeBrand !== brand ? 0.3 : 1}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default LineGraph;
