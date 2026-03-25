import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TamaguiProvider } from '@tamagui/core';
import config from '@/tamagui.config';
import { StarRating } from '@/components/ui/StarRating';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider config={config} defaultTheme="light">{children}</TamaguiProvider>
);

describe('StarRating', () => {
  it('renders 5 stars', () => {
    const { getAllByRole } = render(
      <StarRating value={3} onChange={jest.fn()} />,
      { wrapper }
    );
    expect(getAllByRole('button').length).toBe(5);
  });

  it('calls onChange with the tapped star index', () => {
    const onChange = jest.fn();
    const { getAllByRole } = render(
      <StarRating value={0} onChange={onChange} />,
      { wrapper }
    );
    fireEvent.press(getAllByRole('button')[2]); // 3rd star = rating 3
    expect(onChange).toHaveBeenCalledWith(3);
  });
});
