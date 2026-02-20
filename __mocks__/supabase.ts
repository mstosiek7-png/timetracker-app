// =====================================================
// TimeTracker - Supabase Mock
// =====================================================

// Mock dla środowiska testowego Jest
type MockFunction = () => any;

interface MockSupabase {
  from: MockFunction & { mockReturnThis: MockFunction };
  select: MockFunction & { mockReturnThis: MockFunction };
  insert: MockFunction & { mockReturnThis: MockFunction };
  update: MockFunction & { mockReturnThis: MockFunction };
  delete: MockFunction & { mockReturnThis: MockFunction };
  eq: MockFunction & { mockReturnThis: MockFunction };
  order: MockFunction & { mockReturnThis: MockFunction };
  limit: MockFunction & { mockReturnThis: MockFunction };
  single: MockFunction & { mockReturnThis: MockFunction };
  storage: {
    from: MockFunction & { mockReturnThis: MockFunction };
    upload: MockFunction & { mockReturnThis: MockFunction };
    remove: MockFunction & { mockReturnThis: MockFunction };
  };
  auth: {
    getUser: MockFunction;
    signIn: MockFunction;
    signOut: MockFunction;
  };
}

const createMockFunction = (): MockFunction & { mockReturnThis: MockFunction } => {
  const fn: any = () => fn;
  fn.mockReturnThis = () => fn;
  fn.mockReturnValue = (value: any) => ({ ...fn, mockReturnValue: () => value });
  fn.mockResolvedValue = (value: any) => ({ ...fn, mockResolvedValue: () => Promise.resolve(value) });
  fn.mockRejectedValue = (value: any) => ({ ...fn, mockRejectedValue: () => Promise.reject(value) });
  return fn;
};

const mockSupabase: MockSupabase = {
  from: createMockFunction(),
  select: createMockFunction(),
  insert: createMockFunction(),
  update: createMockFunction(),
  delete: createMockFunction(),
  eq: createMockFunction(),
  order: createMockFunction(),
  limit: createMockFunction(),
  single: createMockFunction(),
  storage: {
    from: createMockFunction(),
    upload: createMockFunction(),
    remove: createMockFunction()
  },
  auth: {
    getUser: createMockFunction(),
    signIn: createMockFunction(),
    signOut: createMockFunction()
  }
};

// Mock responses
export const mockSupabaseResponse = (data: any, error: any = null) => ({
  data,
  error,
  count: data ? (Array.isArray(data) ? data.length : 1) : 0,
  status: error ? 400 : 200,
  statusText: error ? 'Error' : 'OK'
});

// Mock implementation
export const supabase = {
  ...mockSupabase,
  from: () => mockSupabase,
  storage: mockSupabase.storage,
  auth: mockSupabase.auth
};

export default supabase;