import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/charts/styles.css';
import './global.scss';
import 'dayjs/locale/vi';
import { useEffect } from 'react';
import { MantineProvider } from '@mantine/core';
import { clearChunkReloadFlag } from '@/utils/lazyWithRetry';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { BrowserRouter } from 'react-router-dom';
import { DatesProvider } from '@mantine/dates';
import { theme } from './theme';
import { colorSchemeManager } from '@/configs/colorScheme';
import { Layout } from '@/components/Layout/Layout';
import store, { persistor } from '@/store';
import appConfig from './configs/app.config';
import { mockServer } from './mock/mock';
import { ModalsProvider } from '@mantine/modals';

export default function App() {
  useEffect(() => {
    clearChunkReloadFlag();
  }, []);

  if (appConfig.enableMock) {
    mockServer();
  }

  return (
    <MantineProvider
      theme={theme}
      forceColorScheme="light"
    >
      <ModalsProvider>
        <DatesProvider settings={{ locale: 'vi' }}>
          <Provider store={store}>
            <PersistGate loading={null} persistor={persistor}>
              <BrowserRouter>
                <Layout />
              </BrowserRouter>
            </PersistGate>
          </Provider>
        </DatesProvider>
      </ModalsProvider>
    </MantineProvider>
  );
}
  