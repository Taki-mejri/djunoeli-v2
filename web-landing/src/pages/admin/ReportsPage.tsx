import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const revenue = [
  { m: "Jan", v: 28000 }, { m: "Fév", v: 31000 }, { m: "Mar", v: 35000 },
  { m: "Avr", v: 40000 }, { m: "Mai", v: 44000 }, { m: "Juin", v: 48250 },
];
const perf = [
  { d: "Skander", v: 142 }, { d: "Mohamed", v: 118 }, { d: "Ali", v: 96 }, { d: "Nizar", v: 74 }, { d: "Hatem", v: 52 },
];

export default function ReportsPage() {
  return (
    <>
      <div className="ds-page-head">
        <div><h1>Rapports & Analytics</h1><p>Performance opérationnelle et financière.</p></div>
        <div className="row-actions">
          <button className="tbl-btn-ghost">Excel</button>
          <button className="tbl-btn-ghost">PDF</button>
        </div>
      </div>
      <div className="chart-row">
        <div className="panel">
          <div className="panel-head"><h3>Revenus mensuels (DT)</h3><span className="panel-tag">6 mois</span></div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={revenue} margin={{ top: 10, right: 10, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
              <XAxis dataKey="m" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8a99a8" }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8a99a8" }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e3eaf0", fontSize: 13 }} />
              <Line type="monotone" dataKey="v" name="Revenus" stroke="#0e9c7d" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="panel">
          <div className="panel-head"><h3>Performance livreurs</h3><span className="panel-tag">Ce mois</span></div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={perf} layout="vertical" margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8a99a8" }} />
              <YAxis type="category" dataKey="d" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8a99a8" }} width={60} />
              <Tooltip cursor={{ fill: "#f5f8fb" }} contentStyle={{ borderRadius: 12, border: "1px solid #e3eaf0", fontSize: 13 }} />
              <Bar dataKey="v" name="Livraisons" fill="#1fc4a0" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
