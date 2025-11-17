import App from '../App'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { RequireLogin, RequireProjectPermission } from './guards'
import { LoginPage } from './login'
import { ProjectPage } from './project'
import { ProjectsPage } from './projects'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<Navigate to="/projects" replace />} />

          <Route path="login" element={<LoginPage />} />

          <Route
            path="projects"
            element={
              <RequireLogin>
                <ProjectsPage />
              </RequireLogin>
            }
          />

          <Route
            path="projects/:projectId"
            element={
              <RequireLogin>
                <RequireProjectPermission permissionKey="project.read">
                  <ProjectPage />
                </RequireProjectPermission>
              </RequireLogin>
            }
          />

          <Route path="*" element={<div className="text-sm text-zinc-600">Not Found</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

