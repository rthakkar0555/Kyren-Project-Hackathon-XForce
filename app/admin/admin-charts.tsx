"use client"

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell, Legend
} from "recharts"

const TOOLTIP_STYLE = {
    borderRadius: '0px',
    border: '2px solid #000',
    backgroundColor: '#fff',
    color: '#000',
    boxShadow: '4px 4px 0px 0px #000',
    fontWeight: 'bold',
    fontSize: '12px',
}

export function GrowthAreaChart({ data }: { data: any[] }) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366F1" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis
                    dataKey="name"
                    stroke="#6B7280"
                    fontSize={12}
                    fontWeight={600}
                    tickLine={false}
                    axisLine={false}
                    dy={8}
                />
                <YAxis
                    stroke="#6B7280"
                    fontSize={11}
                    fontWeight={600}
                    tickLine={false}
                    axisLine={false}
                    dx={-8}
                />
                <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    cursor={{ stroke: '#000', strokeWidth: 1, strokeDasharray: '4 4' }}
                    formatter={(value: any, name: string) => {
                        if (name === 'mrr') return [`$${value}`, 'Est. MRR']
                        return [value, name === 'users' ? 'Total Users' : name]
                    }}
                />
                <Legend
                    wrapperStyle={{ fontSize: '11px', fontWeight: 700, paddingTop: '12px' }}
                    formatter={(value) => value === 'users' ? 'Total Users' : value === 'mrr' ? 'Est. MRR ($)' : value}
                />
                <Area
                    type="monotone"
                    dataKey="users"
                    name="users"
                    stroke="#6366F1"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorUsers)"
                    dot={{ fill: '#6366F1', strokeWidth: 2, r: 4, stroke: '#fff' }}
                    activeDot={{ r: 6, fill: '#6366F1', stroke: '#fff', strokeWidth: 2 }}
                    animationDuration={1500}
                />
                <Area
                    type="monotone"
                    dataKey="mrr"
                    name="mrr"
                    stroke="#10B981"
                    strokeWidth={2}
                    strokeDasharray="5 3"
                    fillOpacity={1}
                    fill="url(#colorMrr)"
                    dot={false}
                    animationDuration={1800}
                />
            </AreaChart>
        </ResponsiveContainer>
    )
}

export function ActivityBarChart({ data }: { data: any[] }) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis
                    dataKey="name"
                    stroke="#6B7280"
                    fontSize={12}
                    fontWeight={600}
                    tickLine={false}
                    axisLine={false}
                    dy={8}
                />
                <YAxis
                    stroke="#6B7280"
                    fontSize={11}
                    fontWeight={600}
                    tickLine={false}
                    axisLine={false}
                    dx={-8}
                    allowDecimals={false}
                />
                <Tooltip
                    cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                    contentStyle={TOOLTIP_STYLE}
                />
                <Legend
                    wrapperStyle={{ fontSize: '11px', fontWeight: 700, paddingTop: '12px' }}
                />
                <Bar name="New Users" dataKey="newUsers" fill="#6366F1" radius={[3, 3, 0, 0]} maxBarSize={32} animationDuration={1500} />
                <Bar name="New Courses" dataKey="newCourses" fill="#EF4444" radius={[3, 3, 0, 0]} maxBarSize={32} animationDuration={1800} />
            </BarChart>
        </ResponsiveContainer>
    )
}

export function UsersDonutChart({ data }: { data: any[] }) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={82}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                    animationDuration={1500}
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                </Pie>
                <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    itemStyle={{ color: '#000' }}
                    formatter={(value: any, name: string) => [value, name]}
                />
            </PieChart>
        </ResponsiveContainer>
    )
}
