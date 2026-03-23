import { Suspense } from 'react';
import { Route, RouterProvider, createBrowserRouter, createRoutesFromElements } from 'react-router-dom';
import { publicRoutes, privateRoutes } from '@routes/publicRoutes';
import { ProtectedRoute } from './ProtectedRoute';

const LoadingFallback = () => (
  <div className="content-body">
    <div className="container-fluid d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
      <div className="spinner-border text-primary" role="status">
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  </div>
);

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route>
      {publicRoutes.map((route) => (
        <Route key={route.path} path={route.path} element={route.element} />
      ))}
      <Route element={<ProtectedRoute />}>
        {privateRoutes.map((route) => (
          <Route key={route.path} path={route.path} element={route.element} />
        ))}
      </Route>
    </Route>,
  ),
);

export const AppRouter = () => (
  <Suspense fallback={<LoadingFallback />}>
    <RouterProvider router={router} />
  </Suspense>
);
