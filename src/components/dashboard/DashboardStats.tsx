'use client'

import { Users, Clock, CheckCircle, Calendar, TrendingUp } from 'lucide-react'

interface DashboardStatsProps {
  stats: {
    total: number
    pending: number
    inProgress: number
    completed: number
    recent: number
  }
}

export default function DashboardStats({ stats }: DashboardStatsProps) {
  const statCards = [
    {
      title: 'Tổng ứng viên',
      value: stats.total,
      icon: Users,
      color: 'bg-blue-500',
      description: 'Tổng số phỏng vấn đã tạo',
    },
    {
      title: 'Chờ thực hiện',
      value: stats.pending,
      icon: Clock,
      color: 'bg-yellow-500',
      description: 'Phỏng vấn chưa bắt đầu',
    },
    {
      title: 'Đang tiến hành',
      value: stats.inProgress,
      icon: TrendingUp,
      color: 'bg-orange-500',
      description: 'Phỏng vấn đang diễn ra',
    },
    {
      title: 'Hoàn thành',
      value: stats.completed,
      icon: CheckCircle,
      color: 'bg-green-500',
      description: 'Phỏng vấn đã kết thúc',
    },
    {
      title: '7 ngày gần đây',
      value: stats.recent,
      icon: Calendar,
      color: 'bg-purple-500',
      description: 'Phỏng vấn mới trong tuần',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      {statCards.map((card) => {
        const Icon = card.icon
        return (
          <div
            key={card.title}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {card.value}
                </p>
              </div>
              <div className={`${card.color} rounded-lg p-3`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">{card.description}</p>
          </div>
        )
      })}
    </div>
  )
}