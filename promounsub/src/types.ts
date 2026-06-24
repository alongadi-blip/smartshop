export interface Sender {
  email: string;
  name: string;
  count: number;
  latestMessageId: string;
  unsubscribeUrl?: string;
  unsubscribeEmail?: string;
  supportsOneClick?: boolean;
  status: 'idle' | 'loading' | 'done' | 'error';
  errorMsg?: string;
}

export interface ScanState {
  phase: 'idle' | 'listing' | 'fetching' | 'done';
  total: number;
  loaded: number;
}
