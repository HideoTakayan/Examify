import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Paper, Title, Text, Stack, TextInput, PasswordInput,
  Button, Alert, Loader, Center, Box,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { IconCheck, IconX } from '@tabler/icons-react';
import { resetPassword } from '@/services/authApi';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMsg('Thiếu token đặt lại mật khẩu. Vui lòng truy cập link từ email.');
    }
  }, [token]);

  const handleSubmit = async () => {
    if (!password) {
      setStatus('error');
      setMsg('Vui lòng nhập mật khẩu mới.');
      return;
    }
    if (password.length < 6) {
      setStatus('error');
      setMsg('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    if (password !== confirm) {
      setStatus('error');
      setMsg('Mật khẩu xác nhận không khớp.');
      return;
    }

    setStatus('loading');
    setMsg('');
    try {
      await resetPassword(token, password);
      setStatus('success');
      setMsg('Mật khẩu đã được đặt lại thành công. Bạn có thể đăng nhập ngay.');
    } catch (err: unknown) {
      setStatus('error');
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setMsg(axiosErr?.response?.data?.error || 'Không thể đặt lại mật khẩu. Token có thể đã hết hạn.');
    }
  };

  if (!token) {
    return (
      <Center style={{ minHeight: '100vh' }}>
        <Paper p="xl" radius="md" w={420}>
          <Alert color="red" icon={<IconX size={16} />} title="Lỗi">
            {msg}
          </Alert>
        </Paper>
      </Center>
    );
  }

  return (
    <Center style={{ minHeight: '100vh' }}>
      <Paper p="xl" radius="md" w={420}>
        <Stack gap="md">
          <Title order={2}>Đặt lại mật khẩu</Title>

          {status === 'success' ? (
            <Alert color="green" icon={<IconCheck size={16} />} title="Thành công">
              {msg} — <a href="/login">Đăng nhập</a>
            </Alert>
          ) : (
            <>
              <Text size="sm" c="dimmed">
                Nhập mật khẩu mới cho tài khoản của bạn.
              </Text>
              <PasswordInput
                label="Mật khẩu mới"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Ít nhất 6 ký tự"
                required
              />
              <PasswordInput
                label="Xác nhận mật khẩu"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Nhập lại mật khẩu"
                required
              />
              {status === 'error' && <Alert color="red" variant="light">{msg}</Alert>}
              <ButtonFilled
                label="Đặt lại mật khẩu"
                disabled={status === 'loading'}
                loading={status === 'loading'}
                onClick={() => void handleSubmit()}
                fullWidth
              />
            </>
          )}
        </Stack>
      </Paper>
    </Center>
  );
}