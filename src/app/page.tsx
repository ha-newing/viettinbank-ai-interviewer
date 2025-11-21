export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8 text-vietinbank-red">
          VietinBank AI Interview System
        </h1>
        <p className="text-center text-lg text-muted-foreground mb-8">
          Hệ thống phỏng vấn AI tự động cho tuyển dụng quy mô lớn
        </p>
        <div className="bg-card p-6 rounded-lg border shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Phase 1 Implementation</h2>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
              ✅ Next.js 15 + React 19 setup complete
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></span>
              🚧 Database schema configuration
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-gray-300 rounded-full mr-3"></span>
              ⏳ Authentication system
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-gray-300 rounded-full mr-3"></span>
              ⏳ Candidate dashboard
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-gray-300 rounded-full mr-3"></span>
              ⏳ Video interview interface
            </li>
          </ul>
        </div>
      </div>
    </main>
  )
}