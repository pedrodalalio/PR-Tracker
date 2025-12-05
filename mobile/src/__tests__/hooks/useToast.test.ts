import { renderHook, act } from '@testing-library/react-native';
import { useToast } from '../../hooks/useToast';
import Toast from 'react-native-toast-message';

// Mock Toast module
jest.mock('react-native-toast-message');

const mockToast = Toast as jest.Mocked<typeof Toast>;

describe('useToast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with all required functions', () => {
    const { result } = renderHook(() => useToast());

    expect(result.current.showToast).toBeDefined();
    expect(result.current.showSuccess).toBeDefined();
    expect(result.current.showError).toBeDefined();
    expect(result.current.showWarning).toBeDefined();
    expect(result.current.showInfo).toBeDefined();
    expect(result.current.hideToast).toBeDefined();
  });

  describe('showToast', () => {
    it('should call Toast.show with default values', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showToast({ message: 'Test message' });
      });

      expect(mockToast.show).toHaveBeenCalledWith({
        type: 'info',
        text1: undefined,
        text2: 'Test message',
        visibilityTime: 4000,
        position: 'top',
      });
    });

    it('should call Toast.show with custom values', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showToast({
          type: 'success',
          title: 'Custom Title',
          message: 'Custom message',
          duration: 5000,
          position: 'bottom',
        });
      });

      expect(mockToast.show).toHaveBeenCalledWith({
        type: 'success',
        text1: 'Custom Title',
        text2: 'Custom message',
        visibilityTime: 5000,
        position: 'bottom',
      });
    });
  });

  describe('showSuccess', () => {
    it('should call showToast with success type and default title', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showSuccess('Success message');
      });

      expect(mockToast.show).toHaveBeenCalledWith({
        type: 'success',
        text1: 'Sucesso',
        text2: 'Success message',
        visibilityTime: 4000,
        position: 'top',
      });
    });

    it('should call showToast with success type and custom title', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showSuccess('Success message', 'Custom Success');
      });

      expect(mockToast.show).toHaveBeenCalledWith({
        type: 'success',
        text1: 'Custom Success',
        text2: 'Success message',
        visibilityTime: 4000,
        position: 'top',
      });
    });
  });

  describe('showError', () => {
    it('should call showToast with error type and default title', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showError('Error message');
      });

      expect(mockToast.show).toHaveBeenCalledWith({
        type: 'error',
        text1: 'Erro',
        text2: 'Error message',
        visibilityTime: 4000,
        position: 'top',
      });
    });

    it('should call showToast with error type and custom title', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showError('Error message', 'Custom Error');
      });

      expect(mockToast.show).toHaveBeenCalledWith({
        type: 'error',
        text1: 'Custom Error',
        text2: 'Error message',
        visibilityTime: 4000,
        position: 'top',
      });
    });
  });

  describe('showWarning', () => {
    it('should call showToast with warning type and default title', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showWarning('Warning message');
      });

      expect(mockToast.show).toHaveBeenCalledWith({
        type: 'warning',
        text1: 'Atenção',
        text2: 'Warning message',
        visibilityTime: 4000,
        position: 'top',
      });
    });

    it('should call showToast with warning type and custom title', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showWarning('Warning message', 'Custom Warning');
      });

      expect(mockToast.show).toHaveBeenCalledWith({
        type: 'warning',
        text1: 'Custom Warning',
        text2: 'Warning message',
        visibilityTime: 4000,
        position: 'top',
      });
    });
  });

  describe('showInfo', () => {
    it('should call showToast with info type and default title', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showInfo('Info message');
      });

      expect(mockToast.show).toHaveBeenCalledWith({
        type: 'info',
        text1: 'Informação',
        text2: 'Info message',
        visibilityTime: 4000,
        position: 'top',
      });
    });

    it('should call showToast with info type and custom title', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showInfo('Info message', 'Custom Info');
      });

      expect(mockToast.show).toHaveBeenCalledWith({
        type: 'info',
        text1: 'Custom Info',
        text2: 'Info message',
        visibilityTime: 4000,
        position: 'top',
      });
    });
  });

  describe('hideToast', () => {
    it('should call Toast.hide', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.hideToast();
      });

      expect(mockToast.hide).toHaveBeenCalled();
    });
  });
});