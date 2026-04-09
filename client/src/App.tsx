import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppProvider } from './stores/app-store'
import HomePage from './pages/HomePage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import TeacherClasses from './pages/teacher/Classes'
import TeacherLive from './pages/teacher/Live'
import TeacherWhiteboard from './pages/teacher/WhiteboardMode'
import TeacherBigscreenActivities from './pages/teacher/BigscreenActivities'
import TeacherBigscreenActivityRun from './pages/teacher/BigscreenActivityRun'
import TeacherTaskGroups from './pages/teacher/TaskGroups'
import TeacherPacks from './pages/teacher/Packs'
import TeacherTeachingAids from './pages/teacher/TeachingAids'
import ImportTeachingAid from './pages/teacher/ImportTeachingAid'
import TeacherAnalytics from './pages/teacher/Analytics'
import TeacherHome from './pages/teacher/TeacherHome'
import TeacherMembership from './pages/teacher/Membership'
import TeacherClassroomReview from './pages/teacher/ClassroomReview'
import TeacherClassroomReviewDetail from './pages/teacher/ClassroomReviewDetail'
import PaymentResult from './pages/teacher/PaymentResult'
import Notifications from './pages/Notifications'
import StudentHome from './pages/student/Home'
import StudentLive from './pages/student/Live'
import StudentPack from './pages/student/Pack'
import StudentPractice from './pages/student/Practice'
import StudentSpeaking from './pages/student/Speaking'
import StudentReport from './pages/student/Report'
import StudentFree from './pages/student/Free'
import JoinClass from './pages/student/JoinClass'
import Settings from './pages/Settings'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import ShareView from './pages/ShareView'
import AdminLayout from './components/layout/AdminLayout'
import AdminLoginPage from './pages/admin/LoginPage'
import AdminDashboard from './pages/admin/Dashboard'
import AdminUsers from './pages/admin/Users'
import AdminMessages from './pages/admin/Messages'
import AdminActivities from './pages/admin/Activities'
import AdminMembershipSettings from './pages/admin/MembershipSettings'
import AdminTeachingAids from './pages/admin/TeachingAids'
import AdminTeachingAidDetail from './pages/admin/TeachingAidDetail'
import AdminInvitationCodes from './pages/admin/InvitationCodes'
import { StudentAiProvider } from './features/student-ai/context/StudentAiContext'
import StudentAiPanel from './features/student-ai/components/StudentAiPanel'
import { ProductTourProvider } from './features/product-tour/ProductTourProvider'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <ProductTourProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/join" element={<JoinClass />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/share/task-group/:token" element={<ShareView />} />
              <Route path="/notifications" element={<Notifications />} />

              <Route path="/teacher" element={<TeacherHome />} />
              <Route path="/teacher/classes" element={<TeacherClasses />} />
              <Route path="/teacher/task-groups" element={<TeacherTaskGroups />} />
              <Route path="/teacher/live" element={<TeacherLive />} />
              <Route path="/teacher/whiteboard" element={<TeacherWhiteboard />} />
              <Route path="/teacher/classroom-review" element={<TeacherClassroomReview />} />
              <Route path="/teacher/classroom-review/:id" element={<TeacherClassroomReviewDetail />} />
              <Route path="/teacher/teaching-aids" element={<TeacherTeachingAids />} />
              <Route path="/import/teaching-aid/:shareCode" element={<ImportTeachingAid />} />
              <Route path="/teacher/bigscreen-activities" element={<TeacherBigscreenActivities />} />
              <Route path="/teacher/bigscreen-activities/run/:sessionId" element={<TeacherBigscreenActivityRun />} />
              <Route path="/teacher/packs" element={<TeacherPacks />} />
              <Route path="/teacher/analytics" element={<TeacherAnalytics />} />
              <Route path="/teacher/membership" element={<TeacherMembership />} />
              <Route path="/teacher/payment-result" element={<PaymentResult />} />

              <Route path="/student" element={<StudentHome />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/teacher/settings" element={<Settings />} />
              <Route path="/student/settings" element={<Settings />} />
              <Route path="/student/live" element={<StudentAiProvider><StudentLive /><StudentAiPanel /></StudentAiProvider>} />
              <Route path="/student/pack" element={<StudentPack />} />
              <Route path="/student/practice" element={<StudentPractice />} />
              <Route path="/student/speaking" element={<StudentSpeaking />} />
              <Route path="/student/report" element={<StudentReport />} />
              <Route path="/student/free" element={<StudentFree />} />

              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="messages" element={<AdminMessages />} />
                <Route path="activities" element={<AdminActivities />} />
                <Route path="membership" element={<AdminMembershipSettings />} />
                <Route path="invitation-codes" element={<AdminInvitationCodes />} />
                <Route path="teaching-aids" element={<AdminTeachingAids />} />
                <Route path="teaching-aids/:aidId" element={<AdminTeachingAidDetail />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ProductTourProvider>
      </AppProvider>
    </QueryClientProvider>
  )
}

export default App
