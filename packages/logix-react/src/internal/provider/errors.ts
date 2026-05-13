export class RuntimeProviderNotFoundError extends Error {
  constructor(hookName: string) {
    super(
        `[${hookName}] React host adapter not found (<RuntimeProvider>).\n` +
        '\n' +
        'Fix:\n' +
        '- Wrap your app (or the calling React subtree) with <RuntimeProvider runtime={runtime}>.\n' +
        '- If using nested providers, ensure an ancestor React host adapter provides `runtime`.\n' +
        '- If you intended to call this hook outside React, use @logixjs/core directly.\n',
    )
    this.name = 'RuntimeProviderNotFoundError'
  }
}
