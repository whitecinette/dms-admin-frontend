import { VscGraphLine } from "react-icons/vsc";
import { FaFileAlt } from "react-icons/fa";
import { IoPricetagSharp } from "react-icons/io5";
import { TiUserAdd } from "react-icons/ti";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
} from "recharts";
import { MdPhoneIphone } from "react-icons/md";

import "./style.scss";
import SalesGrowth from "../../components/salesGrowth";
function Dashboard() {
  const extractionData = [
    {
      month: "Jan",
      iPhone: 320,
      Samsung: 290,
      OnePlus: 340,
      Realme: 270,
      "Google Pixel": 180,
      Motorola: 200,
      Oppo: 310,
      Vivo: 290,
      Xiaomi: 330,
    },
    {
      month: "Feb",
      iPhone: 300,
      Samsung: 260,
      OnePlus: 330,
      Realme: 280,
      "Google Pixel": 190,
      Motorola: 210,
      Oppo: 300,
      Vivo: 280,
      Xiaomi: 320,
    },
    {
      month: "Mar",
      iPhone: 280,
      Samsung: 230,
      OnePlus: 310,
      Realme: 290,
      "Google Pixel": 200,
      Motorola: 220,
      Oppo: 290,
      Vivo: 270,
      Xiaomi: 310,
    },
    {
      month: "Apr",
      iPhone: 260,
      Samsung: 220,
      OnePlus: 290,
      Realme: 300,
      "Google Pixel": 210,
      Motorola: 230,
      Oppo: 280,
      Vivo: 260,
      Xiaomi: 300,
    },
    {
      month: "May",
      iPhone: 250,
      Samsung: 300,
      OnePlus: 270,
      Realme: 310,
      "Google Pixel": 220,
      Motorola: 240,
      Oppo: 270,
      Vivo: 250,
      Xiaomi: 290,
    },
    {
      month: "Jun",
      iPhone: 290,
      Samsung: 350,
      OnePlus: 310,
      Realme: 320,
      "Google Pixel": 230,
      Motorola: 250,
      Oppo: 260,
      Vivo: 240,
      Xiaomi: 280,
    },
    {
      month: "Jul",
      iPhone: 320,
      Samsung: 400,
      OnePlus: 350,
      Realme: 330,
      "Google Pixel": 240,
      Motorola: 260,
      Oppo: 250,
      Vivo: 230,
      Xiaomi: 270,
    },
    {
      month: "Aug",
      iPhone: 330,
      Samsung: 370,
      OnePlus: 360,
      Realme: 340,
      "Google Pixel": 250,
      Motorola: 270,
      Oppo: 240,
      Vivo: 220,
      Xiaomi: 260,
    },
    {
      month: "Sep",
      iPhone: 310,
      Samsung: 340,
      OnePlus: 330,
      Realme: 350,
      "Google Pixel": 260,
      Motorola: 280,
      Oppo: 230,
      Vivo: 210,
      Xiaomi: 250,
    },
    {
      month: "Oct",
      iPhone: 290,
      Samsung: 310,
      OnePlus: 300,
      Realme: 360,
      "Google Pixel": 270,
      Motorola: 290,
      Oppo: 220,
      Vivo: 200,
      Xiaomi: 240,
    },
    {
      month: "Nov",
      iPhone: 270,
      Samsung: 280,
      OnePlus: 290,
      Realme: 370,
      "Google Pixel": 280,
      Motorola: 300,
      Oppo: 210,
      Vivo: 190,
      Xiaomi: 230,
    },
    {
      month: "Dec",
      iPhone: 250,
      Samsung: 260,
      OnePlus: 270,
      Realme: 380,
      "Google Pixel": 290,
      Motorola: 310,
      Oppo: 200,
      Vivo: 180,
      Xiaomi: 220,
    },
  ];
  const lastEntry = extractionData.at(-1);

  const color = ["red", "orange", "green", "purple"];
  const products = [
    { id: "01", name: "Himanshu Sharma", popularity: 45 },
    { id: "02", name: "Rahul Sharma", popularity: 29 },
    { id: "03", name: "Anil Saini", popularity: 18 },
    { id: "04", name: "Sunil Saini", popularity: 25 },
  ];
  const salesData = [
    {
      title: "Total sales",
      value: 1000,
      yesterday: "+5%",
      icon: <VscGraphLine />,
    },
    { title: "Total order", value: 300, yesterday: "+5%", icon: <FaFileAlt /> },
    {
      title: "Product Sold",
      value: 5,
      yesterday: "+5%",
      icon: <IoPricetagSharp />,
    },
    { title: "New Customers", value: 8, yesterday: "+5%", icon: <TiUserAdd /> },
  ];
  return (
    <div className="dashboard">
      <div className="dashboard-header">Dashboard</div>
      <div className="first-line">
        <div className="today-sales">
          <SalesGrowth />
          {/**
                    <div className="content">
                        <div className="title">
                            Todays Sales
                        </div>
                        <div className="sales-data">
                            {salesData.map((item, index) => (
                                <div className={`sales-card ${color[index % color.length]}`} key={index}>
                                    <div className={`sale-icon ${color[index % color.length]}`}>
                                        {item.icon}
                                    </div>
                                    <div className="info">
                                        <div className="sale-value">{item.value}</div>
                                        <div className="sale-title">{item.title}</div>
                                        <div className="sale-yesterday">{item.yesterday}from yesterday</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                     */}
        </div>
        <div className="extraction-insights-graph">
          <div className="extraction-header">Extraction Insights</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={extractionData}>
              <XAxis tick={{ fontSize: 10 }} dataKey="month" />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="iPhone"
                stroke="#FF5733"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="Samsung"
                stroke="#33FF57"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="OnePlus"
                stroke="#3380FF"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="second-line">
        <div className="total-revenue-graph">
          <div className="total-revenue-header">Total Revenue</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={extractionData}>
              <XAxis tick={{ fontSize: 10 }} interval={1} dataKey="month" />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              {/* Bars for different brands */}
              <Bar dataKey="iPhone" fill="#0095FF" />
              <Bar dataKey="Samsung" fill="#00E096" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="customer-satisfaction-graph">
          <div className="customer-satisfaction-header">
            Customer Satisfaction
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart
              data={extractionData}
              margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorLastMonth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#438ef7" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#438ef7" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorThisMonth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34c38f" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#34c38f" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis hide dataKey="name" />
              <YAxis hide />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="iPhone"
                stroke="#438ef7"
                fillOpacity={1}
                fill="url(#colorLastMonth)"
              />
              <Area
                type="monotone"
                dataKey="Samsung"
                stroke="#34c38f"
                fillOpacity={1}
                fill="url(#colorThisMonth)"
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="data-table-content">
            <div>{lastEntry["iPhone"]}</div>
            <div>{lastEntry.Samsung}</div>
          </div>
        </div>
        <div className="target-reality-graph">
          <div className="target-reality-header">Target Vs Reality</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={extractionData}>
              <XAxis dataKey="month" interval={1} />
              <YAxis hide />
              <Tooltip />

              {/* Bars for different brands */}
              <Bar
                dataKey="iPhone"
                fill="#4AB58E"
                barSize={30}
                radius={[5, 5, 0, 0]}
                fillOpacity={0.8}
              />
              <Bar
                dataKey="Samsung"
                fill="#FFCF00"
                barSize={30}
                radius={[5, 5, 0, 0]}
                fillOpacity={0.8}
              />
            </BarChart>
            <div className="custom-legend">
              <div className="custom-legend-content green">
                <div>
                  <MdPhoneIphone />
                  iPhone
                </div>
                <span>{lastEntry.iPhone}</span>
              </div>
              <div className="custom-legend-content yellow">
                <div>
                  <MdPhoneIphone />
                  Samsung
                </div>
                <span>{lastEntry.Samsung}</span>
              </div>
            </div>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="third-line">
        <div className="top-products">
          <div className="top-products-header">Top Products</div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Popularity</th>
                <th>Sales</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product, index) => (
                <tr>
                  <td>{index}</td>
                  <td>{product.name}</td>
                  <td>
                    <div className="progress-bar">
                      <div
                        className={`progress ${color[index % color.length]} `}
                        style={{
                          width: `${product.popularity}%`,
                        }}
                      ></div>
                      <div className="progress-bg"></div>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`sales-badge ${color[index % color.length]}`}
                      style={{ color: product.color }}
                    >
                      {product.popularity}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="volume-service">
          <div className="volume-service-header">Volume vs Service Level</div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={extractionData} barSize={40}>
              <XAxis dataKey="name" stroke="#8884d8" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="iPhone" stackId="a" fill="#00C49F" />
              <Bar dataKey="Samsung" stackId="a" fill="#0088FE" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
export default Dashboard;
