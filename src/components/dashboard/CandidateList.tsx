'use client'

import { useState, useEffect } from 'react'
import { Search, Plus, Filter, Eye, Edit, Trash2, Mail, FileText } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

interface Interview {
  id: string
  candidateName: string
  candidateEmail: string
  candidatePhone?: string
  interviewStatus: 'pending' | 'in_progress' | 'completed' | 'expired'
  candidateStatus: 'all' | 'screened' | 'selected' | 'rejected' | 'waiting'
  overallScore?: number
  recommendation?: 'RECOMMEND' | 'CONSIDER' | 'NOT_RECOMMEND'
  createdAt: Date
  completedAt?: Date
}

interface CandidateListProps {
  organizationId: string
}

// Vietnamese status labels
const interviewStatusLabels = {
  pending: 'Chờ thực hiện',
  in_progress: 'Đang tiến hành',
  completed: 'Hoàn thành',
  expired: 'Đã hết hạn',
} as const

const candidateStatusLabels = {
  all: 'Tất cả',
  screened: 'Đã sàng lọc',
  selected: 'Đã chọn',
  rejected: 'Đã từ chối',
  waiting: 'Danh sách chờ',
} as const

const recommendationLabels = {
  RECOMMEND: 'Khuyến nghị tuyển dụng',
  CONSIDER: 'Cân nhắc',
  NOT_RECOMMEND: 'Không khuyến nghị',
} as const

// Candidate status tabs (PRD-compliant pipeline)
const statusTabs = [
  { key: 'all', label: 'TẤT CẢ', count: 0, icon: '📋' },
  { key: 'screened', label: 'SÀNG LỌC', count: 0, icon: '✅' },
  { key: 'selected', label: 'ĐÃ CHỌN', count: 0, icon: '💼' },
  { key: 'rejected', label: 'ĐÃ TỪ CHỐI', count: 0, icon: '❌' },
  { key: 'waiting', label: 'DANH SÁCH CHỜ', count: 0, icon: '⏳' },
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
        interviewStatus: 'pending',
        candidateStatus: 'screened',
        createdAt: new Date('2024-11-20'),
      },
      {
        id: '2',
        candidateName: 'Trần Thị Bình',
        candidateEmail: 'binh.tran@example.com',
        candidatePhone: '0912345678',
        interviewStatus: 'completed',
        candidateStatus: 'selected',
        overallScore: 85,
        recommendation: 'RECOMMEND',
        createdAt: new Date('2024-11-19'),
        completedAt: new Date('2024-11-19'),
      },
      {
        id: '3',
        candidateName: 'Lê Hoàng Cường',
        candidateEmail: 'cuong.le@example.com',
        interviewStatus: 'in_progress',
        candidateStatus: 'screened',
        createdAt: new Date('2024-11-21'),
      },
      {
        id: '4',
        candidateName: 'Phạm Thị Dung',
        candidateEmail: 'dung.pham@example.com',
        candidatePhone: '0923456789',
        interviewStatus: 'completed',
        candidateStatus: 'waiting',
        overallScore: 72,
        recommendation: 'CONSIDER',
        createdAt: new Date('2024-11-18'),
        completedAt: new Date('2024-11-18'),
      },
      {
        id: '5',
        candidateName: 'Võ Minh Em',
        candidateEmail: 'em.vo@example.com',
        interviewStatus: 'expired',
        candidateStatus: 'rejected',
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
          : mockInterviews.filter((interview) => interview.candidateStatus === tab.key).length,
    }))
    setTabs(updatedTabs)

    setLoading(false)
  }, [])

  // Filter interviews based on selected tab and search query
  const filteredInterviews = interviews.filter((interview) => {
    const matchesTab = selectedTab === 'all' || interview.candidateStatus === selectedTab
    const matchesSearch =
      !searchQuery ||
      interview.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      interview.candidateEmail.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesTab && matchesSearch
  })

  const getInterviewStatusBadgeColor = (status: string) => {
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

  const getCandidateStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'screened':
        return 'bg-blue-100 text-blue-800'
      case 'selected':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'waiting':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getRecommendationBadgeColor = (recommendation?: string) => {
    switch (recommendation) {
      case 'RECOMMEND':
        return 'bg-green-100 text-green-800'
      case 'NOT_RECOMMEND':
        return 'bg-red-100 text-red-800'
      case 'CONSIDER':
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
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <a href="/dashboard/interviews/create">
                <Plus className="h-4 w-4 mr-2" />
                Tạo phỏng vấn mới
              </a>
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

        {/* Status Tabs - PRD Compliant Format */}
        <div className="mt-6">
          <nav className="flex space-x-4 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedTab(tab.key)}
                className={`whitespace-nowrap py-3 px-4 border-b-2 font-semibold text-sm min-h-[44px] flex items-center space-x-2 transition-colors ${
                  selectedTab === tab.key
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span>{tab.label}</span>
                <span
                  className={`py-0.5 px-2 rounded-full text-xs font-medium ${
                    selectedTab === tab.key
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600'
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
              <Button asChild className="mt-4 bg-blue-600 hover:bg-blue-700">
                <a href="/dashboard/interviews/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Tạo phỏng vấn đầu tiên
                </a>
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
                      <Badge className={getInterviewStatusBadgeColor(interview.interviewStatus)}>
                        {interviewStatusLabels[interview.interviewStatus]}
                      </Badge>

                      <Badge className={getCandidateStatusBadgeColor(interview.candidateStatus)}>
                        {candidateStatusLabels[interview.candidateStatus]}
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
                  {interview.interviewStatus === 'completed' ? (
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/reports/${interview.id}`} title="Xem báo cáo chi tiết">
                        <FileText className="h-4 w-4" />
                      </Link>
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" title="Xem chi tiết">
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" title="Chỉnh sửa">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" title="Xóa">
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