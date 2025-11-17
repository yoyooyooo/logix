export class RuntimeProviderNotFoundError extends Error {
  constructor(hookName: string) {
    super(
      `[${hookName}] RuntimeProvider not found.\n` +
        '\n' +
        'Fix:\n' +
        '- Wrap your app (or the calling component subtree) with <RuntimeProvider runtime={runtime}>.\n' +
        '- If using nested providers, ensure an ancestor RuntimeProvider provides `runtime`.\n' +
        '- If you intended to call this hook outside React, use @logix/core directly.\n',
    )
    this.name = 'RuntimeProviderNotFoundError'
  }
}
