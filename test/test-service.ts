// Typescript doesn't want you to define arbitrary services like this on `window` (for good reason)
// so the workaround to test this is `(window as any)`
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).testService = {
  getResponse(): string {
    return 'someresponse';
  },
};
