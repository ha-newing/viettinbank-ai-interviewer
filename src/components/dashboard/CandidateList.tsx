'use client'

import { useState, useEffect } from 'react'
import { Search, Plus, Filter, Eye, Edit, Trash2, Mail } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Interview {
  id: string
  candidateName: string
  candidateEmail: string
  candidatePhone?: string
  status: 'pending' | 'in_progress' | 'completed' | 'expired'
  overallScore?: number
  recommendation?: 'PROCEED' | 'REJECT' | 'REVIEW'
  createdAt: Date
  completedAt?: Date
}

interface CandidateListProps {
  organizationId: string
}

// Vietnamese status labels
const statusLabels = {
  pending: 'Chờ thực hiện',
  in_progress: 'Đang tiến hành',
  completed: 'Hoàn thành',
  expired: 'Đã hết hạn',
} as const

const recommendationLabels = {
  PROCEED: 'Tiếp tục',
  REJECT: 'Từ chối',
  REVIEW: 'Xem xét',
} as const

// Status filter tabs
const statusTabs = [
  { key: 'all', label: 'Tất cả', count: 0 },
  { key: 'pending', label: 'Chờ thực hiện', count: 0 },
  { key: 'in_progress', label: 'Đang tiến hành', count: 0 },
  { key: 'completed', label: 'Hoàn thành', count: 0 },
  { key: 'expired', label: 'Đã hết hạn', count: 0 },
]

export default function CandidateList({ organizationId }: CandidateListProps) {
  const [selectedTab, setSelectedTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)
  const [tabs, setTabs] = useState(statusTabs)

  // Mock data for now - will be replaced with actual API calls
  useEffect(() => {
    // Simulate API call
    const mockInterviews: Interview[] = [
      {
        id: '1',
        candidateName: 'Nguyễn Văn An',
        candidateEmail: 'an.nguyen@example.com',
        candidatePhone: '0901234567',
        status: 'pending',
        createdAt: new Date('2024-11-20'),
      },
      {
        id: '2',
        candidateName: 'Trần Thị Bình',
        candidateEmail: 'binh.tran@example.com',
        candidatePhone: '0912345678',
        status: 'completed',
        overallScore: 85,
        recommendation: 'PROCEED',
        createdAt: new Date('2024-11-19'),
        completedAt: new Date('2024-11-19'),
      },
      {
        id: '3',
        candidateName: 'Lê Hoàng Cường',
        candidateEmail: 'cuong.le@example.com',
        status: 'in_progress',
        createdAt: new Date('2024-11-21'),
      },
      {
        id: '4',
        candidateName: 'Phạm Thị Dung',
        candidateEmail: 'dung.pham@example.com',
        candidatePhone: '0923456789',
        status: 'completed',
        overallScore: 72,
        recommendation: 'REVIEW',
        createdAt: new Date('2024-11-18'),
        completedAt: new Date('2024-11-18'),
      },
      {
        id: '5',
        candidateName: 'Võ Minh Em',
        candidateEmail: 'em.vo@example.com',
        status: 'expired',
        createdAt: new Date('2024-11-15'),
      },
    ]

    setInterviews(mockInterviews)

    // Calculate tab counts
    const updatedTabs = tabs.map((tab) => ({
      ...tab,
      count:
        tab.key === 'all'
          ? mockInterviews.length
          : mockInterviews.filter((interview) => interview.status === tab.key).length,
    }))
    setTabs(updatedTabs)

    setLoading(false)
  }, [])

  // Filter interviews based on selected tab and search query
  const filteredInterviews = interviews.filter((interview) => {
    const matchesTab = selectedTab === 'all' || interview.status === selectedTab
    const matchesSearch =
      !searchQuery ||
      interview.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      interview.candidateEmail.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesTab && matchesSearch
  })

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'expired':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getRecommendationBadgeColor = (recommendation?: string) => {
    switch (recommendation) {
      case 'PROCEED':
        return 'bg-green-100 text-green-800'
      case 'REJECT':
        return 'bg-red-100 text-red-800'
      case 'REVIEW':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Danh sách ứng viên</h3>
            <p className="text-sm text-gray-600 mt-1">
              Quản lý và theo dõi tiến trình phỏng vấn ứng viên
            </p>
          </div>
          <div className="flex space-x-3">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Tạo phỏng vấn mới
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Tìm kiếm theo tên hoặc email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Bộ lọc
          </Button>
        </div>

        {/* Status Tabs */}
        <div className="mt-6">
          <nav className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedTab(tab.key)}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                <span
                  className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                    selectedTab === tab.key
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Candidate List */}
      <div className="divide-y divide-gray-200">
        {filteredInterviews.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-gray-500 text-sm">
              {searchQuery ? 'Không tìm thấy ứng viên phù hợp' : 'Chưa có ứng viên nào'}
            </div>
            {!searchQuery && (
              <Button className="mt-4 bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Tạo phỏng vấn đầu tiên
              </Button>
            )}
          </div>
        ) : (
          filteredInterviews.map((interview) => (
            <div key={interview.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {interview.candidateName}
                      </h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <Mail className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-600 truncate">
                          {interview.candidateEmail}
                        </span>
                        {interview.candidatePhone && (
                          <>
                            <span className="text-gray-300">•</span>
                            <span className="text-xs text-gray-600">
                              {interview.candidatePhone}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusBadgeColor(interview.status)}>
                        {statusLabels[interview.status]}
                      </Badge>

                      {interview.recommendation && (
                        <Badge className={getRecommendationBadgeColor(interview.recommendation)}>
                          {recommendationLabels[interview.recommendation]}
                        </Badge>
                      )}

                      {interview.overallScore && (
                        <div className="text-sm font-medium text-gray-900">
                          {interview.overallScore}%
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                    <span>
                      Tạo: {interview.createdAt.toLocaleDateString('vi-VN')}
                    </span>
                    {interview.completedAt && (
                      <span>
                        Hoàn thành: {interview.completedAt.toLocaleDateString('vi-VN')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination (if needed) */}
      {filteredInterviews.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Hiển thị {filteredInterviews.length} kết quả
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" disabled>
                Trước
              </Button>
              <Button variant="outline" size="sm" disabled>
                Sau
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}