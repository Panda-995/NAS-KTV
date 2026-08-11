import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { useRoomSync } from './hooks/useRoomSync';
import ConnectionBanner from './components/ConnectionBanner';
import Toast from './components/Toast';

function App() {
  useRoomSync();
  return (
    <>
      <ConnectionBanner />
      <Toast />
      <RouterProvider router={router} />
    </>
  );
}

export default App;
