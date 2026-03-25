import React from 'react';
import { render } from '@testing-library/react-native';
import { TamaguiProvider } from '@tamagui/core';
import config from '@/tamagui.config';
import { VibeTags } from '@/components/ui/VibeTags';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider config={config}>{children}</TamaguiProvider>
);

describe('VibeTags', () => {
  it('renders each tag as text', () => {
    const { getByText } = render(
      <VibeTags tags={['Romantic', 'Cozy']} />,
      { wrapper }
    );
    expect(getByText('Romantic')).toBeTruthy();
    expect(getByText('Cozy')).toBeTruthy();
  });

  it('renders nothing when tags is empty', () => {
    const { toJSON } = render(<VibeTags tags={[]} />, { wrapper });
    expect(toJSON()).toBeNull();
  });
});
