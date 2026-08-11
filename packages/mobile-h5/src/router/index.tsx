import { createBrowserRouter, Navigate, useLocation, Outlet } from 'react-router-dom';
import { useRoomStore } from '../stores/room';
import Join from '../pages/Join';
import Unauthorized from '../pages/Unauthorized';
import Home from '../pages/Home';
import Search from '../pages/Search';
import ArtistList from '../pages/ArtistList';
import ArtistDetail from '../pages/ArtistDetail';
import Categories from '../pages/Categories';
import CategoryDetail from '../pages/CategoryDetail';
import Queue from '../pages/Queue';
import RemoteControl from '../components/RemoteControl';

function WildcardRedirect() {
  const location = useLocation();
  return <Navigate to={`/${location.search}`} replace />;
}

// 已加入房间的路由统一布局：渲染页面 + 全局悬浮遥控器
function JoinedLayout() {
  return (
    <>
      <Outlet />
      <RemoteControl />
    </>
  );
}

function RequireJoined({ children }: { children: React.ReactNode }) {
  const { joined, roomCode, roomId, sessionId, sessionToken, sessionExpiresAt, unauthorized } = useRoomStore();
  const location = useLocation();
  if (unauthorized) {
    return <Unauthorized />;
  }
  // 持久化状态可能残留 joined=true，但房间或会话信息已经不完整。
  // 只有完整加入房间后才能访问点歌页面，否则统一回到加入页。
  if (
    !joined ||
    !roomCode ||
    !roomId ||
    !sessionId ||
    !sessionToken ||
    !sessionExpiresAt ||
    sessionExpiresAt <= Date.now()
  ) {
    return <Navigate to={`/join${location.search}`} replace />;
  }
  return <>{children}</>;
}

export const router = createBrowserRouter(
  [
    { path: '/join', element: <Join /> },
    {
      path: '/',
      element: <JoinedLayout />,
      children: [
        {
          index: true,
          element: (
            <RequireJoined>
              <Home />
            </RequireJoined>
          ),
        },
        {
          path: 'search',
          element: (
            <RequireJoined>
              <Search />
            </RequireJoined>
          ),
        },
        {
          path: 'artists',
          element: (
            <RequireJoined>
              <ArtistList />
            </RequireJoined>
          ),
        },
        {
          path: 'artist/:id',
          element: (
            <RequireJoined>
              <ArtistDetail />
            </RequireJoined>
          ),
        },
        {
          path: 'categories',
          element: (
            <RequireJoined>
              <Categories />
            </RequireJoined>
          ),
        },
        {
          path: 'category/:id',
          element: (
            <RequireJoined>
              <CategoryDetail />
            </RequireJoined>
          ),
        },
        {
          path: 'queue',
          element: (
            <RequireJoined>
              <Queue />
            </RequireJoined>
          ),
        },
      ],
    },
    { path: '*', element: <WildcardRedirect /> },
  ],
  { basename: '/h5/' },
);
