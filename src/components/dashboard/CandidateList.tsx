'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Plus, Filter, Eye, Edit, Trash2, Mail, FileText } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { getDashboardInterviews, getCandidateStatusCounts, type DashboardInterview } from '@/app/dashboard/actions'

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
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [interviews, setInterviews] = useState<DashboardInterview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tabs, setTabs] = useState(statusTabs)
  const tabsContainerRef = useRef<HTMLElement>(null)

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300) // 300ms debounce

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch real interview data from database
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)

        // Fetch interviews and status counts in parallel
        const [interviewsResult, countsResult] = await Promise.all([
          getDashboardInterviews({
            candidateStatus: selectedTab,
            searchQuery: debouncedSearchQuery || undefined,
          }),
          getCandidateStatusCounts()
        ])

        if (interviewsResult.success && interviewsResult.data) {
          setInterviews(interviewsResult.data)
        } else {
          setError(interviewsResult.error || 'Failed to fetch interviews')
        }

        if (countsResult.success && countsResult.data) {
          const updatedTabs = tabs.map((tab) => ({
            ...tab,
            count: countsResult.data![tab.key] || 0,
          }))
          setTabs(updatedTabs)
        }

      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
        setError('Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedTab, debouncedSearchQuery])

  // Interviews are already filtered on the server side
  const filteredInterviews = interviews

  // Touch/swipe navigation for tabs
  useEffect(() => {
    const container = tabsContainerRef.current
    if (!container) return

    let startX = 0
    let startY = 0
    let isDragging = false

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      startX = touch.clientX
      startY = touch.clientY
      isDragging = true
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return

      const touch = e.touches[0]
      const deltaX = startX - touch.clientX
      const deltaY = Math.abs(startY - touch.clientY)

      // If vertical movement is more significant, don't handle as swipe
      if (deltaY > 50) return

      // Prevent default scroll behavior for horizontal swipes
      if (Math.abs(deltaX) > 10) {
        e.preventDefault()
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isDragging) return
      isDragging = false

      const touch = e.changedTouches[0]
      const deltaX = startX - touch.clientX
      const deltaY = Math.abs(startY - touch.clientY)

      // Only process horizontal swipes
      if (Math.abs(deltaX) < 50 || deltaY > 100) return

      const currentIndex = tabs.findIndex(tab => tab.key === selectedTab)
      let nextIndex = currentIndex

      if (deltaX > 0 && currentIndex < tabs.length - 1) {
        // Swipe left - next tab
        nextIndex = currentIndex + 1
      } else if (deltaX < 0 && currentIndex > 0) {
        // Swipe right - previous tab
        nextIndex = currentIndex - 1
      }

      if (nextIndex !== currentIndex) {
        setSelectedTab(tabs[nextIndex].key)

        // Smooth scroll to active tab
        const activeButton = container.children[nextIndex] as HTMLElement
        if (activeButton) {
          activeButton.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center'
          })
        }
      }
    }

    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [tabs, selectedTab])

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

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <div className="text-red-600 text-sm mb-4">{error}</div>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="text-sm"
          >
            Tải lại
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <div className="flex flex-col space-y-4">
          {/* Title and Create Button */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Danh sách ứng viên</h3>
              <p className="text-sm text-gray-600 mt-1">
                Quản lý và theo dõi tiến trình phỏng vấn ứng viên
              </p>
            </div>
            <Button asChild className="bg-blue-600 hover:bg-blue-700 h-11 px-4 flex-shrink-0">
              <a href="/dashboard/interviews/create">
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Tạo phỏng vấn mới</span>
                <span className="sm:hidden">Tạo mới</span>
              </a>
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Tìm kiếm theo tên hoặc email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
            <Button variant="outline" className="h-11 px-4 w-full sm:w-auto">
              <Filter className="h-4 w-4 mr-2" />
              Bộ lọc
            </Button>
          </div>
        </div>

        {/* Status Tabs - PRD Compliant Format with Swipe Navigation */}
        <div className="mt-6 relative">
          {/* Swipe indicator for mobile */}
          <div className="sm:hidden text-center text-xs text-gray-500 mb-2">
            ← Vuốt để chuyển tab →
          </div>

          <nav
            ref={tabsContainerRef}
            className="flex space-x-2 sm:space-x-4 overflow-x-auto scrollbar-hide scroll-smooth"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {tabs.map((tab, index) => (
              <button
                key={tab.key}
                onClick={() => {
                  setSelectedTab(tab.key)
                  // Smooth scroll to center the active tab
                  setTimeout(() => {
                    tabsContainerRef.current?.children[index]?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'nearest',
                      inline: 'center'
                    })
                  }, 100)
                }}
                className={`whitespace-nowrap py-3 px-3 sm:px-4 border-b-2 font-semibold text-sm min-h-[44px] flex items-center space-x-2 transition-colors flex-shrink-0 ${
                  selectedTab === tab.key
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="text-xs sm:text-sm">{tab.label}</span>
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

          {/* Gradient fade indicators */}
          <div className="absolute left-0 top-0 w-4 h-full bg-gradient-to-r from-white to-transparent pointer-events-none sm:hidden" />
          <div className="absolute right-0 top-0 w-4 h-full bg-gradient-to-l from-white to-transparent pointer-events-none sm:hidden" />
        </div>
      </div>

      {/* Candidate List */}
      <div className="divide-y divide-gray-200">
        {filteredInterviews.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <div className="text-gray-500 text-sm sm:text-base">
              {searchQuery ? 'Không tìm thấy ứng viên phù hợp' : 'Chưa có ứng viên nào'}
            </div>
            {!searchQuery && (
              <Button asChild className="mt-6 bg-blue-600 hover:bg-blue-700 h-11 px-6">
                <a href="/dashboard/interviews/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Tạo phỏng vấn đầu tiên
                </a>
              </Button>
            )}
          </div>
        ) : (
          filteredInterviews.map((interview) => (
            <div key={interview.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
              {/* Mobile-first responsive layout */}
              <div className="space-y-3">
                {/* Header row with name and actions */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base sm:text-sm font-medium text-gray-900 truncate">
                      {interview.candidateName}
                    </h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <Mail className="h-3 w-3 text-gray-400 flex-shrink-0" />
                      <span className="text-sm sm:text-xs text-gray-600 truncate">
                        {interview.candidateEmail}
                      </span>
                    </div>
                    {interview.candidatePhone && (
                      <div className="text-sm sm:text-xs text-gray-600 mt-1">
                        {interview.candidatePhone}
                      </div>
                    )}
                  </div>

                  {/* Action buttons - always visible on mobile */}
                  <div className="flex items-center space-x-1 ml-4 flex-shrink-0">
                    {interview.interviewStatus === 'completed' ? (
                      <Button variant="ghost" className="h-11 w-11 p-0" asChild>
                        <Link href={`/dashboard/reports/${interview.id}`} title="Xem báo cáo chi tiết">
                          <FileText className="h-4 w-4" />
                        </Link>
                      </Button>
                    ) : (
                      <Button variant="ghost" className="h-11 w-11 p-0" title="Xem chi tiết">
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}

                    {/* Resend email button - only for pending and in_progress interviews */}
                    {(interview.interviewStatus === 'pending' || interview.interviewStatus === 'in_progress') && (
                      <form action="/dashboard/interviews/resend-email" method="post" className="inline">
                        <input type="hidden" name="interviewId" value={interview.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          className="h-11 w-11 p-0 text-blue-600 hover:bg-blue-50"
                          title="Gửi lại email mời phỏng vấn"
                          onClick={(e) => {
                            if (!confirm(`Gửi lại email mời phỏng vấn cho ${interview.candidateName}?`)) {
                              e.preventDefault()
                            }
                          }}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      </form>
                    )}

                    <Button variant="ghost" className="h-11 w-11 p-0" title="Chỉnh sửa">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" className="h-11 w-11 p-0" title="Xóa">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Status badges row - stack on mobile */}
                <div className="flex flex-wrap gap-2">
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
                    <div className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-800 text-sm font-medium rounded">
                      {interview.overallScore}%
                    </div>
                  )}
                </div>

                {/* Metadata row */}
                <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-sm sm:text-xs text-gray-500">
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
            </div>
          ))
        )}
      </div>

      {/* Pagination (if needed) */}
      {filteredInterviews.length > 0 && (
        <div className="p-4 sm:px-6 sm:py-4 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
            <div className="text-sm text-gray-500 text-center sm:text-left">
              Hiển thị {filteredInterviews.length} kết quả
            </div>
            <div className="flex items-center justify-center sm:justify-end space-x-2">
              <Button variant="outline" className="h-11 px-4 flex-1 sm:flex-none" disabled>
                Trước
              </Button>
              <Button variant="outline" className="h-11 px-4 flex-1 sm:flex-none" disabled>
                Sau
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}