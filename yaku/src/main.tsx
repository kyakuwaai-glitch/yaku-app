import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { AuthProvider, Protected, useAuth } from './auth/AuthContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import Splash from './components/Splash'
import NativeBridge from './components/NativeBridge'
import './index.css'
const Catalog = lazy(() => import('./pages/Catalog'))
const Auth = lazy(() => import('./pages/Auth'))
const Dash = lazy(() => import('./pages/Dashboard'))
const Admin = lazy(() => import('./pages/Admin'))
const StaffLogin = lazy(() => import('./pages/StaffLogin'))
const StudioLayout = lazy(() => import('./pages/StudioLayout'))
const StudioHome = lazy(() => import('./pages/StudioHome'))
const StudioOrders = lazy(() => import('./pages/StudioOrders'))
const StudioSupport = lazy(() => import('./pages/StudioSupport'))
const AiPage = lazy(() => import('./pages/AiPage'))
const PrintStudio = lazy(() => import('./pages/PrintStudio'))
const DesignStudio = lazy(() => import('./pages/DesignStudio'))
const ProviderDirectory = lazy(() => import('./pages/providers/ProviderDirectory'))
const ProviderProfile = lazy(() => import('./pages/providers/ProviderProfile'))
const ProviderJoin = lazy(() => import('./pages/providers/ProviderJoin'))
const ProviderDashboard = lazy(() => import('./pages/providers/ProviderDashboard'))
const MyRequests = lazy(() => import('./pages/providers/MyRequests'))
const ProviderAdmin = lazy(() => import('./pages/console/ProviderAdmin'))
const AccountDeletion = lazy(() => import('./pages/AccountDeletion'))
const Console = lazy(() => import('./pages/Console'))
const Info = lazy(() => import('./pages/Info'))
const Soon = lazy(() => import('./pages/Info').then(m => ({ default: m.Soon })))
function Redirect({ to }: { to: string }) { const l = useLocation(); return <Navigate to={to + l.search} replace /> }
function DashHome() { const { profile } = useAuth(); return <Navigate to={`/dashboard/${profile?.role ?? 'customer'}`} replace /> }
createRoot(document.getElementById('root')!).render(
  <StrictMode><HelmetProvider><BrowserRouter><AuthProvider><Splash /><NativeBridge /><Layout>
    <Suspense fallback={<p className="pad">Loading…</p>}><Routes>
      <Route path="/" element={<Home />} />
      <Route path="/department/:slug" element={<Catalog />} />
      <Route path="/search" element={<Catalog />} />
      <Route path="/login" element={<Auth mode="login" />} />
      <Route path="/register" element={<Auth mode="register" />} />
      <Route path="/forgot-password" element={<Auth mode="forgot" />} />
      <Route path="/reset-password" element={<Auth mode="reset" />} />
      <Route path="/account/delete" element={<AccountDeletion />} />
      <Route path="/account" element={<Protected><Auth mode="profile" /></Protected>} />
      <Route path="/wishlist" element={<Protected><Soon title="Wishlist" /></Protected>} />
      <Route path="/cart" element={<Soon title="Shopping cart" />} />
      <Route path="/dashboard" element={<Protected><DashHome /></Protected>} />
      {(['customer', 'vendor', 'designer', 'admin'] as const).map(r =>
        <Route key={r} path={`/dashboard/${r}`} element={<Protected roles={[r]}><Dash role={r} /></Protected>} />)}
      <Route path="/dashboard/admin/manage" element={<Protected roles={['admin']}><Admin /></Protected>} />
      <Route path="/studio" element={<StudioLayout />}>
        <Route index element={<StudioHome />} />
        <Route path="assistant" element={<AiPage />} />
        <Route path="print" element={<PrintStudio key="print" mode="print" />} />
        <Route path="design" element={<DesignStudio />} />
        <Route path="inspector" element={<PrintStudio key="inspector" mode="inspector" />} />
        <Route path="pricing" element={<PrintStudio key="pricing" mode="pricing" />} />
        <Route path="orders" element={<StudioOrders />} />
        <Route path="support" element={<StudioSupport />} />
      </Route>
      <Route path="/ai" element={<Redirect to="/studio/assistant" />} />
      <Route path="/print-studio" element={<Redirect to="/studio/print" />} />
      <Route path="/design-studio" element={<Redirect to="/studio/design" />} />
      <Route path="/providers" element={<ProviderDirectory />} />
      <Route path="/providers/join" element={<ProviderJoin />} />
      <Route path="/providers/requests" element={<Protected><MyRequests /></Protected>} />
      <Route path="/providers/:id" element={<ProviderProfile />} />
      <Route path="/provider" element={<Protected><ProviderDashboard /></Protected>} />
      <Route path="/dashboard/admin/providers" element={<Protected roles={['admin']}><div className="sec"><h1>Service Provider Management</h1><ProviderAdmin /></div></Protected>} />
      <Route path="/console" element={<Console />} />
      <Route path="/staff-login" element={<StaffLogin />} />
      <Route path="/info/:slug" element={<Info />} />
      <Route path="*" element={<Info notFound />} />
    </Routes></Suspense>
  </Layout></AuthProvider></BrowserRouter></HelmetProvider></StrictMode>)
