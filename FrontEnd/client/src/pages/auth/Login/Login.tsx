import {
  Paper,
  Flex,
  BackgroundImage,
  Center,
  Text,
  Title,
  Box,
  Anchor,
  Alert,
  Modal,
  Stack,
} from '@mantine/core';
import { Carousel } from '@mantine/carousel';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import image from '@/assets/img/login.jpg';
import classes from './Login.module.scss';
import appConfig from '@/configs/app.config';
import { login, saveSession, forgotPassword as forgotPasswordApi, resetPassword as resetPasswordApi } from '@/services/authApi';
import InputText from '@/components/Input/InputText/InputText';
import InputPassword from '@/components/Input/InputPassword/InputPassword';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';
import { useAppDispatch } from '@/hooks/useAppStore';
import { refreshAuthFromStorage } from '@/store/authSlice';
import { clearClientSession } from '@/services/clearClientSession';

function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (searchParams.get('session') !== 'revoked') return;
    setWarning(t('login.session_kicked'));
    void clearClientSession().then(() => {
      navigate({ pathname: '/login', search: '' }, { replace: true });
    });
  }, [searchParams, t, navigate]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotOpened, setForgotOpened] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [forgotMsg, setForgotMsg] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError(t('login.missing_fields'));
      return;
    }
    try {
      setLoading(true);
      setError('');
      setWarning('');
      const result = await login(email, password);
      if (!result?.token || !result?.user?.id) {
        setError(t('login.login_failed'));
        return;
      }
      await saveSession(result.token, result.user);
      dispatch(refreshAuthFromStorage());
      const mustChange =
        result.user.first_login &&
        result.user.role !== 'admin';
      const target = mustChange
        ? '/change-password-required'
        : appConfig.authenticatedEntryPath;
      navigate(target, { replace: true });
      if (result.hasExistingSession) {
        sessionStorage.setItem(
          'login_flash',
          t('login.session_revoked_warning')
        );
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string } } };
      const msg =
        axiosErr?.response?.status === 401 && axiosErr?.response?.data?.message
          ? axiosErr.response.data.message
          : (typeof err === 'object' &&
              err !== null &&
              'response' in err &&
              typeof (err as { response?: { data?: { message?: string } } }).response
                ?.data?.message === 'string' &&
              (err as { response?: { data?: { message?: string } } }).response?.data
                ?.message) ||
            t('login.login_failed');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') handleLogin();
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) {
      setForgotStatus('error');
      setForgotMsg(t('login.forgot_email_required'));
      return;
    }
    setForgotStatus('loading');
    setForgotMsg('');
    try {
      const result = await forgotPasswordApi(forgotEmail);
      setForgotStatus('success');
      setForgotMsg(result.message || t('login.forgot_success'));
    } catch (err: unknown) {
      setForgotStatus('error');
      const axiosErr = err as { response?: { data?: { message?: string; error?: string } } };
      setForgotMsg(
        axiosErr?.response?.data?.message ||
        axiosErr?.response?.data?.error ||
        t('login.forgot_failed')
      );
    }
  };

  return (
    <Center style={{ minHeight: '100vh', background: '#F4F4F5' }}>
      <Paper
        shadow="md"
        radius="xl"
        maw={960}
        w="100%"
        mx="md"
        style={{ overflow: 'hidden', display: 'grid', gridTemplateColumns: '1fr 1fr' }}
      >
        {/* ── Left: form ── */}
        <Flex align="center" justify="center" p={48}>
          <Box w="100%" maw={360} onKeyDown={handleKeyDown} tabIndex={0}>
            {/* Logo / brand */}
            <Text fw={700} fz="xl" mb={32} style={{ letterSpacing: '-0.01em' }}>
              Examify
            </Text>

            <Flex gap={6} direction="column" mb={28}>
              <Title order={2} fz="1.6rem" style={{ letterSpacing: '-0.02em' }}>
                {t('login.title')}
              </Title>
              <Text c="dimmed" fz="sm">{t('login.subtitle')}</Text>
            </Flex>

            <Flex gap={14} direction="column" mb={8}>
              <InputText
                label={t('login.email')}
                placeholder={t('login.email_placeholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                required
              />
              <InputPassword
                label={t('login.password')}
                placeholder={t('login.password_placeholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                required
              />
            </Flex>

            <Anchor
              underline="never"
              fz="sm"
              c="dimmed"
              style={{ display: 'inline-block', cursor: 'pointer', marginBottom: 16 }}
              onClick={() => setForgotOpened(true)}
            >
              {t('login.forgot_password')}
            </Anchor>

            {error && (
              <Text color="red" fz="sm" mb={10}>{error}</Text>
            )}
            {warning && (
              <Alert color="yellow" variant="light" mb={10}>{warning}</Alert>
            )}

            <ButtonFilled
              label={t('login.submit')}
              disabled={loading}
              fullWidth
              onClick={handleLogin}
              loading={loading}
            />
          </Box>
        </Flex>

        {/* ── Right: hero image ── */}
        <BackgroundImage src={image} classNames={{ root: classes.rootImage }}>
          <Box className={classes.heroContent}>
            <Title order={2} c="white" mb={16} fz="1.5rem" style={{ letterSpacing: '-0.01em' }}>
              {t('login.hero_title')}
            </Title>
            <Carousel
              withIndicators
              withControls={false}
              classNames={{
                indicators: classes.indicators,
                indicator: classes.indicator,
              }}
            >
              <Carousel.Slide>
                <Text fz="sm" c="rgba(255,255,255,.85)" maw={360} style={{ lineHeight: 1.6 }}>
                  {t('login.hero_slide_1')}
                </Text>
              </Carousel.Slide>
              <Carousel.Slide>
                <Text fz="sm" c="rgba(255,255,255,.85)" maw={360} style={{ lineHeight: 1.6 }}>
                  {t('login.hero_slide_2')}
                </Text>
              </Carousel.Slide>
            </Carousel>
          </Box>
        </BackgroundImage>
      </Paper>

      <Modal
        opened={forgotOpened}
        onClose={() => { setForgotOpened(false); setForgotStatus('idle'); setForgotMsg(''); setForgotEmail(''); }}
        title={t('login.forgot_password')}
        centered
        radius="lg"
      >
        <Stack gap="sm">
          <Text size="sm" c="dimmed">{t('login.forgot_desc')}</Text>
          {forgotStatus === 'success' ? (
            <Alert color="green" variant="light">{forgotMsg}</Alert>
          ) : (
            <>
              <InputText
                label={t('login.email')}
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                fullWidth
                placeholder={t('login.email_placeholder')}
              />
              {forgotStatus === 'error' && <Text c="red" size="sm">{forgotMsg}</Text>}
              <ButtonFilled
                label={t('login.forgot_submit')}
                disabled={forgotStatus === 'loading'}
                loading={forgotStatus === 'loading'}
                onClick={handleForgotPassword}
                fullWidth
              />
            </>
          )}
        </Stack>
      </Modal>
    </Center>
  );
}

export default Login;