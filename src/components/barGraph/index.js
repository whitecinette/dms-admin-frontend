import { BarChart,Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import React, { useState, useMemo } from "react";
const colorPalette = [
    "#FF8000", "#33FF57", "#3380FF", "#FF33A6", "#A31ACB", "#FFD733",
    "#8DFF33", "#FF3333", "#33A6FF", "#E91E63", "#9C27B0", "#673AB7",
    "#3F51B5", "#2196F3", "#FFEB3B"
]
function BarGraph({ data }) {
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
  return(
    <>
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} >
            
            <XAxis tick={{ fontSize: 10 }} dataKey="month" />
            <YAxis  tick={{ fontSize: 10 }}/>
            <Tooltip />
            <Legend onMouseEnter={handleLegendHover} onMouseLeave={handleLegendLeave} />
            {/* Bars for different brands */}
            {Object.keys(brandColors).map((brand) => (
                <Bar
                key={brand}
                dataKey={brand}
                fill={brandColors[brand]}  
                opacity={activeBrand && activeBrand !== brand ? 0.3 : 1}
              />
                      ))}
            </BarChart>
        </ResponsiveContainer>
    </>
  )
}
export default BarGraph;