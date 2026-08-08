import { configureStore, createSlice } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';
import { persistReducer, persistStore } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import authReducer from './authSlice';

const appSlice = createSlice({
  name: 'app',
  initialState: {},
  reducers: {},
});

const rootReducer = combineReducers({
  app: appSlice.reducer,
  auth: authReducer,
});

const persistedReducer = persistReducer(
  {
    key: 'root',
    storage,
    whitelist: ['app', 'auth'],
  },
  rootReducer
);

const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

const persistor = persistStore(store);

export { persistor };
export default store;
