import { Center, Loader } from '@mantine/core';

const LoadingScreen = () => {
  return (
    <Center h="100%" w="100%" style={{ minHeight: '100vh', flex: 1 }}>
      <Loader size="lg" />
    </Center>
  );
};

export default LoadingScreen;
