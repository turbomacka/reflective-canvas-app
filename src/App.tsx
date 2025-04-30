import { Route, Routes, Navigate } from 'react-router-dom';
import Page from './pages/Page';
import Admin from './pages/Admin';

export default function App() {
  return (
    <Routes>
      <Route path="/page/:slug" element={<Page />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<Navigate to="/page/example" replace />} />
    </Routes>
  );
}
