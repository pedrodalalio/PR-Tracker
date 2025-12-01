import NetInfo from '@react-native-community/netinfo';

export interface NetworkState {
  isConnected: boolean;
  isOnline: boolean;
  type: string | null;
}

class NetworkService {
  private listeners: Array<(state: NetworkState) => void> = [];
  private currentState: NetworkState = {
    isConnected: false,
    isOnline: false,
    type: null,
  };

  constructor() {
    this.initialize();
  }

  private async initialize() {
    // Get initial state
    const state = await NetInfo.fetch();
    this.updateState(state);

    // Listen for changes
    NetInfo.addEventListener((state) => {
      this.updateState(state);
    });
  }

  private updateState(netInfoState: any) {
    const newState: NetworkState = {
      isConnected: netInfoState.isConnected || false,
      isOnline: netInfoState.isConnected && netInfoState.isInternetReachable !== false,
      type: netInfoState.type || null,
    };

    if (
      newState.isConnected !== this.currentState.isConnected ||
      newState.isOnline !== this.currentState.isOnline
    ) {
      console.log('[NetworkService] State changed:', newState);
      this.currentState = newState;
      this.notifyListeners(newState);
    }
  }

  private notifyListeners(state: NetworkState) {
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('[NetworkService] Error notifying listener:', error);
      }
    });
  }

  public getCurrentState(): NetworkState {
    return { ...this.currentState };
  }

  public isOnline(): boolean {
    return this.currentState.isOnline;
  }

  public isConnected(): boolean {
    return this.currentState.isConnected;
  }

  public addListener(callback: (state: NetworkState) => void): () => void {
    this.listeners.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public async checkConnection(): Promise<NetworkState> {
    const state = await NetInfo.fetch();
    this.updateState(state);
    return this.getCurrentState();
  }
}

export const networkService = new NetworkService();