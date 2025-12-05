import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import LoginScreen from '../../screens/LoginScreen';

// Mock ToastService
jest.mock('../../services/toastService', () => ({
  ToastService: {
    showError: jest.fn(),
    showSuccess: jest.fn(),
  },
}));

describe('LoginScreen', () => {
  const mockOnLogin = jest.fn();
  const mockOnShowRegister = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    onLogin: mockOnLogin,
    onShowRegister: mockOnShowRegister,
  };

  it('should render without crashing', () => {
    const component = render(<LoginScreen {...defaultProps} />);
    expect(component).toBeTruthy();
  });

  it('should render essential login elements', () => {
    const { getByText } = render(<LoginScreen {...defaultProps} />);

    expect(getByText('PR Tracker')).toBeTruthy();
  });

  it('should have login functionality', () => {
    const { getByText } = render(<LoginScreen {...defaultProps} />);

    // Basic smoke test for demo login
    const demoButton = getByText('Ver Demo');
    fireEvent.press(demoButton);

    expect(mockOnLogin).toHaveBeenCalled();
  });
});