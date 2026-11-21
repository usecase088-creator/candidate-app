// Reanimated's jest matcher (installed by setUpTests() in jest.setup.ts) ships no type declaration.
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveAnimatedStyle(style: Record<string, unknown>): R;
    }
  }
}
export {};
