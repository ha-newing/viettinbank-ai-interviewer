'use client'

import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Upload, User, Users, Mail, Phone, Clock, CheckCircle, Loader2, FileText, X } from 'lucide-react'
import { createSingleInterview, createBulkInterviews } from '@/app/dashboard/interviews/actions'

interface JobTemplate {
  id: string
  title: string
  description: string | null
  interviewDuration: number
  impressionWeight: number
  taskPerformanceWeight: number
  logicalThinkingWeight: number
  researchAbilityWeight: number
  communicationWeight: number
}

interface AuthUser {
  id: string
  email: string
  organizationId: string
  organizationName: string
  isAdmin: boolean
}

interface CreateInterviewFormProps {
  user: AuthUser
  jobTemplates: JobTemplate[]
}

function SubmitButton({ type }: { type: 'single' | 'bulk' }) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {type === 'single' ? 'Đang tạo phỏng vấn...' : 'Đang xử lý danh sách...'}
        </>
      ) : (
        <>
          {type === 'single' ? (
            <><Mail className="mr-2 h-4 w-4" />Tạo và gửi email mời</>
          ) : (
            <><Users className="mr-2 h-4 w-4" />Tạo phỏng vấn hàng loạt</>
          )}
        </>
      )}
    </Button>
  )
}

export default function CreateInterviewForm({ user, jobTemplates }: CreateInterviewFormProps) {
  const [singleState, singleAction] = useFormState(
    async (prevState: any, formData: FormData) => await createSingleInterview(formData),
    null
  )
  const [bulkState, bulkAction] = useFormState(
    async (prevState: any, formData: FormData) => await createBulkInterviews(formData),
    null
  )

  // Single interview form state
  const [singleForm, setSingleForm] = useState({
    candidateName: '',
    candidateEmail: '',
    candidatePhone: '',
    jobTemplateId: '',
    notes: '',
  })

  // Bulk upload state
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvPreview, setCsvPreview] = useState<Array<{
    name: string
    email: string
    phone?: string
  }>>([])
  const [bulkJobTemplateId, setBulkJobTemplateId] = useState('')

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setCsvFile(file)

    // Parse CSV for preview (simplified - in production use proper CSV parser)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split('\n')
      const preview = lines.slice(1, 6).map((line) => { // Skip header, show first 5 rows
        const [name, email, phone] = line.split(',').map(s => s.trim())
        return { name, email, phone }
      }).filter(item => item.name && item.email)

      setCsvPreview(preview)
    }
    reader.readAsText(file)
  }

  const selectedTemplate = jobTemplates.find(t => t.id === singleForm.jobTemplateId || t.id === bulkJobTemplateId)

  return (
    <div className="space-y-6">
      <Tabs defaultValue="single" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="single" className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>Phỏng vấn đơn lẻ</span>
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Upload danh sách</span>
          </TabsTrigger>
        </TabsList>

        {/* Single Interview Tab */}
        <TabsContent value="single">
          <Card>
            <CardHeader>
              <CardTitle>Tạo phỏng vấn cho ứng viên</CardTitle>
              <CardDescription>
                Nhập thông tin ứng viên và chọn job template để tạo phỏng vấn
              </CardDescription>
            </CardHeader>
            <CardContent>
              {singleState && (
                <Alert className={singleState.success ? 'border-green-200 bg-green-50 mb-6' : 'border-red-200 bg-red-50 mb-6'}>
                  <div className="flex items-center">
                    {singleState.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <div className="h-4 w-4 rounded-full bg-red-500" />
                    )}
                    <AlertDescription className={`ml-2 ${singleState.success ? 'text-green-800' : 'text-red-800'}`}>
                      {singleState.success ? singleState.message : singleState.error}
                    </AlertDescription>
                  </div>
                </Alert>
              )}

              <form action={singleAction} className="space-y-6">
                {/* Candidate Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="candidateName">Họ và tên ứng viên *</Label>
                    <Input
                      id="candidateName"
                      name="candidateName"
                      required
                      value={singleForm.candidateName}
                      onChange={(e) => setSingleForm({ ...singleForm, candidateName: e.target.value })}
                      placeholder="Nguyễn Văn An"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="candidateEmail">Email ứng viên *</Label>
                    <Input
                      id="candidateEmail"
                      name="candidateEmail"
                      type="email"
                      required
                      value={singleForm.candidateEmail}
                      onChange={(e) => setSingleForm({ ...singleForm, candidateEmail: e.target.value })}
                      placeholder="an.nguyen@example.com"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="candidatePhone">Số điện thoại</Label>
                    <Input
                      id="candidatePhone"
                      name="candidatePhone"
                      type="tel"
                      value={singleForm.candidatePhone}
                      onChange={(e) => setSingleForm({ ...singleForm, candidatePhone: e.target.value })}
                      placeholder="0901234567"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="jobTemplateId">Job Template *</Label>
                    <Select
                      name="jobTemplateId"
                      value={singleForm.jobTemplateId}
                      onValueChange={(value) => setSingleForm({ ...singleForm, jobTemplateId: value })}
                      required
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Chọn job template" />
                      </SelectTrigger>
                      <SelectContent>
                        {jobTemplates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            <div className="flex items-center space-x-2">
                              <span>{template.title}</span>
                              <Badge variant="outline">
                                <Clock className="h-3 w-3 mr-1" />
                                {template.interviewDuration} phút
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {jobTemplates.length === 0 && (
                      <p className="text-xs text-yellow-600 mt-1">
                        Chưa có job template nào. <a href="/dashboard/templates/create" className="underline">Tạo template mới</a>
                      </p>
                    )}
                  </div>
                </div>

                {/* Job Template Preview */}
                {selectedTemplate && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">Template được chọn:</h4>
                    <div className="text-sm text-blue-800">
                      <p><strong>{selectedTemplate.title}</strong></p>
                      {selectedTemplate.description && (
                        <p className="text-xs mt-1">{selectedTemplate.description}</p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-xs">
                        <span>Thời gian: {selectedTemplate.interviewDuration} phút</span>
                        <span>Tiêu chí: 5 chiều đo</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <Label htmlFor="notes">Ghi chú (tùy chọn)</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    value={singleForm.notes}
                    onChange={(e) => setSingleForm({ ...singleForm, notes: e.target.value })}
                    placeholder="Ghi chú thêm về ứng viên hoặc vị trí..."
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <SubmitButton type="single" />
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulk Upload Tab */}
        <TabsContent value="bulk">
          <Card>
            <CardHeader>
              <CardTitle>Upload danh sách ứng viên</CardTitle>
              <CardDescription>
                Upload file CSV hoặc Excel để tạo nhiều phỏng vấn cùng lúc
              </CardDescription>
            </CardHeader>
            <CardContent>
              {bulkState && (
                <Alert className={bulkState.success ? 'border-green-200 bg-green-50 mb-6' : 'border-red-200 bg-red-50 mb-6'}>
                  <div className="flex items-center">
                    {bulkState.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <div className="h-4 w-4 rounded-full bg-red-500" />
                    )}
                    <AlertDescription className={`ml-2 ${bulkState.success ? 'text-green-800' : 'text-red-800'}`}>
                      {bulkState.success ? bulkState.message : bulkState.error}
                    </AlertDescription>
                  </div>
                </Alert>
              )}

              <form action={bulkAction} className="space-y-6">
                {/* Job Template Selection */}
                <div>
                  <Label htmlFor="bulkJobTemplateId">Job Template cho tất cả ứng viên *</Label>
                  <Select
                    name="jobTemplateId"
                    value={bulkJobTemplateId}
                    onValueChange={setBulkJobTemplateId}
                    required
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Chọn job template" />
                    </SelectTrigger>
                    <SelectContent>
                      {jobTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex items-center space-x-2">
                            <span>{template.title}</span>
                            <Badge variant="outline">
                              <Clock className="h-3 w-3 mr-1" />
                              {template.interviewDuration} phút
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* File Upload */}
                <div>
                  <Label htmlFor="csvFile">File danh sách ứng viên *</Label>
                  <div className="mt-1">
                    <div className="flex items-center justify-center w-full">
                      <label
                        htmlFor="csvFile"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-8 h-8 mb-4 text-gray-500" />
                          <p className="mb-2 text-sm text-gray-500">
                            <span className="font-semibold">Click để upload</span> hoặc kéo thả file
                          </p>
                          <p className="text-xs text-gray-500">CSV hoặc XLSX (tối đa 10MB)</p>
                        </div>
                        <input
                          id="csvFile"
                          name="csvFile"
                          type="file"
                          accept=".csv,.xlsx,.xls"
                          className="hidden"
                          onChange={handleCsvUpload}
                          required
                        />
                      </label>
                    </div>
                  </div>

                  {csvFile && (
                    <div className="mt-2 flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-gray-700">{csvFile.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setCsvFile(null)
                          setCsvPreview([])
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* CSV Format Info */}
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <h4 className="text-sm font-medium text-yellow-900 mb-2">Định dạng file CSV:</h4>
                  <div className="text-xs text-yellow-800">
                    <p className="font-mono">name,email,phone</p>
                    <p className="font-mono">Nguyễn Văn An,an.nguyen@example.com,0901234567</p>
                    <p className="font-mono">Trần Thị Bình,binh.tran@example.com,0912345678</p>
                    <p className="mt-2">• Dòng đầu tiên là header</p>
                    <p>• Phone là tùy chọn (có thể để trống)</p>
                  </div>
                </div>

                {/* CSV Preview */}
                {csvPreview.length > 0 && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">
                      Preview ({csvPreview.length} ứng viên đầu tiên):
                    </h4>
                    <div className="space-y-2">
                      {csvPreview.map((candidate, index) => (
                        <div key={index} className="flex items-center space-x-4 text-sm">
                          <span className="font-medium">{candidate.name}</span>
                          <span className="text-gray-600">{candidate.email}</span>
                          {candidate.phone && (
                            <span className="text-gray-500">{candidate.phone}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <SubmitButton type="bulk" />
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}