import { AreaChart, Area, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import React, { useMemo, useState } from "react";

const colorPalette = [
    "#FF8000", "#33FF57", "#3380FF", "#FF33A6", "#A31ACB", "#FFD733",
    "#8DFF33", "#FF3333", "#33A6FF", "#E91E63", "#9C27B0", "#673AB7",
    "#3F51B5", "#2196F3", "#FFEB3B"
]

function AreaGraph({ data }) {
  const [activeBrand, setActiveBrand] = useState(null);

  const brandColors = useMemo(() => {
    const assignedColors = {};
    let colorIndex = 0;
    Object.keys(data[0]).forEach((brand) => {
      if (brand !== "name") {
        assignedColors[brand] = colorPalette[colorIndex % colorPalette.length];
        colorIndex++;
      }
    });
    return assignedColors;
  }, [data]);

  const handleLegendHover = (event) => {
    setActiveBrand(event.value);
  };

  const handleLegendLeave = () => {
    setActiveBrand(null);
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
        <defs>
          {Object.keys(brandColors).map((brand, index) => (
            <linearGradient key={index} id={`color${brand}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={brandColors[brand]} stopOpacity={0.4} />
              <stop offset="95%" stopColor={brandColors[brand]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        
        {/* Show the first month label on the X-axis */}
        <XAxis 
          dataKey="name" 
          tickFormatter={(value, index) => index === 0 ? value : ""}
          tick={{ fontSize: 12 }}
        />
        
        <YAxis hide />
        <Tooltip />
        <Legend onMouseEnter={handleLegendHover} onMouseLeave={handleLegendLeave} />

        {Object.keys(brandColors).map((brand) => (
          <Area
            key={brand}
            type="monotone"
            dataKey={brand}
            stroke={brandColors[brand]}
            strokeWidth={2}
            fillOpacity={activeBrand && activeBrand !== brand ? 0.2 : 1} 
            strokeOpacity={activeBrand && activeBrand !== brand ? 0.2 : 1}
            fill={`url(#color${brand})`}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default AreaGraph;
