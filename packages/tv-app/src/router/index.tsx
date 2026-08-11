import { createHashRouter } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useRoomStore } from '../stores/room';
import { useConfigStore } from '../stores/config';
import Bootstrap from '../pages/Bootstrap';
import Unauthorized from '../pages/Unauthorized';
import NowPlaying from '../pages/NowPlaying';
import Queue from '../pages/Queue';
import Home from '../pages/Home';
import Setup from '../pages/Setup';
import BackendConfigOverlay from '../components/BackendConfigOverlay';

// 路由守卫：配置未就绪时进入设置页；已配置则按授权状态决定路由
function GuardedRoute({ children }: { children: React.ReactNode }) {
  const { loaded, configured } = useConfigStore();
  const { room, authorized } = useRoomStore();

  // 配置异步加载中（App 启动读取配置）：显示加载
  if (!loaded) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center gap-md">
        <Loader2 className="w-12 h-12 text-accent animate-spin" />
        <p className="text-ink-2 text-lg">正在加载配置...</p>
      </div>
    );
  }

  // 无后端配置：首次使用，进入设置页
  if (!configured) {
    return <Setup />;
  }

  // 无 room：设备注册中（首次启动 或 被删除后重新生成）
  if (!room) {
    return <Bootstrap />;
  }
  // 有 room 且已授权：进入主界面（优先级高于 status 检查，
  // 避免首次注册 status=pending 时授权成功却仍停在等待页）
  if (authorized) {
    return (
      <>
        <BackendConfigOverlay />
        {children}
      </>
    );
  }
  // 有 room 但 status=pending：等待管理员首次授权
  if (room.status === 'pending') {
    return <Bootstrap />;
  }
  // 有 room 但授权被撤销/过期：显示未授权提示
  return <Unauthorized />;
}

export const router = createHashRouter([
  {
    path: '/',
    element: (
      <GuardedRoute>
        <NowPlaying />
      </GuardedRoute>
    ),
  },
  {
    path: '/queue',
    element: (
      <GuardedRoute>
        <Queue />
      </GuardedRoute>
    ),
  },
  {
    path: '/browse',
    element: (
      <GuardedRoute>
        <Home />
      </GuardedRoute>
    ),
  },
  {
    path: '/setup',
    element: (
      <GuardedRoute>
        <Setup />
      </GuardedRoute>
    ),
  },
]);
